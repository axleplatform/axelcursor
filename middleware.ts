import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  try {
    console.log("Middleware executing for path:", request.nextUrl.pathname)
    
    // Create a Supabase client configured to use cookies
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    console.log("Session check in middleware:", {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError,
      path: request.nextUrl.pathname,
      cookies: request.cookies.toString()
    })

    // If there's no session and trying to access protected routes, redirect to login
    if (!session) {
      console.log("No session found, checking if path is protected")
      const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic-dashboard") ||
        request.nextUrl.pathname.startsWith("/onboarding-mechanic-")

      if (isProtectedRoute) {
        console.log("Protected route accessed without session, redirecting to login")
        const redirectUrl = new URL("/login", request.url)
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // If there is a session, check if it's a mechanic
    console.log("Session found, checking mechanic profile")
    const { data: mechanicProfile, error: profileError } = await supabase
      .from("mechanic_profiles")
      .select("onboarding_completed, onboarding_step, id")
      .eq("user_id", session.user.id)
      .single()

    console.log("Mechanic profile check result:", {
      hasProfile: !!mechanicProfile,
      error: profileError,
      onboardingCompleted: mechanicProfile?.onboarding_completed,
      onboardingStep: mechanicProfile?.onboarding_step
    })

    // If accessing mechanic routes but not a mechanic, redirect to home
    if (request.nextUrl.pathname.startsWith("/mechanic-dashboard") && (!mechanicProfile || profileError)) {
      console.log("Non-mechanic accessing mechanic route, redirecting to home")
      return NextResponse.redirect(new URL("/", request.url))
    }

    // If mechanic hasn't completed onboarding, redirect to appropriate step
    if (mechanicProfile && !mechanicProfile.onboarding_completed) {
      const step = mechanicProfile.onboarding_step || "personal_info"
      const stepNumber = getStepNumber(step)
      const onboardingPath = `/onboarding-mechanic-${stepNumber}`

      // Only redirect if not already on an onboarding page
      if (!request.nextUrl.pathname.startsWith("/onboarding-mechanic-")) {
        console.log("Mechanic hasn't completed onboarding, redirecting to step:", stepNumber)
        return NextResponse.redirect(new URL(onboardingPath, request.url))
      }
    }

    // Add session cookie to response if it exists
    if (session) {
      // Set both httpOnly and non-httpOnly cookies for better compatibility
      res.cookies.set("sb-auth-token", session.access_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })

      // Also set a non-httpOnly cookie for client-side access
      res.cookies.set("sb-auth-token-client", session.access_token, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // On error, redirect to login with error message
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("error", "Authentication error. Please try again.")
    return NextResponse.redirect(redirectUrl)
  }
}

// Helper function to get step number
function getStepNumber(step: string): string {
  switch (step) {
    case "personal_info": return "1"
    case "professional_info": return "2"
    case "certifications": return "3"
    case "rates": return "4"
    case "profile": return "5"
    default: return "1"
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/mechanic-dashboard",
    "/onboarding-mechanic-:path*",
    "/dashboard/:path*"
  ]
}
