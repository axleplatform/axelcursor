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
      error: sessionError
    })

    // If there's no session and trying to access protected routes, redirect to login
    if (!session) {
      console.log("No session found, checking if path is protected")
      const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic/dashboard") ||
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

    console.log("Mechanic profile check in middleware:", {
      hasProfile: !!mechanicProfile,
      onboarding_completed: mechanicProfile?.onboarding_completed,
      onboarding_step: mechanicProfile?.onboarding_step,
      error: profileError
    })

    // If accessing mechanic dashboard or onboarding
    if (request.nextUrl.pathname.startsWith("/mechanic/dashboard") ||
        request.nextUrl.pathname.startsWith("/onboarding-mechanic-")) {
      
      // If no mechanic profile, redirect to login
      if (!mechanicProfile) {
        console.log("No mechanic profile found, redirecting to login")
        const redirectUrl = new URL("/login", request.url)
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // If onboarding is not completed, redirect to appropriate step
      if (!mechanicProfile.onboarding_completed) {
        console.log("Onboarding not completed, checking current step")
        const step = mechanicProfile.onboarding_step || "personal_info"
        const currentStep = request.nextUrl.pathname.split("-").pop()
        
        // If trying to access a step that's not the current one, redirect to current step
        if (currentStep !== getStepNumber(step)) {
          console.log("Redirecting to correct onboarding step:", step)
          return NextResponse.redirect(new URL(`/onboarding-mechanic-${getStepNumber(step)}`, request.url))
        }
      } else if (request.nextUrl.pathname.startsWith("/onboarding-mechanic-")) {
        // If onboarding is completed but trying to access onboarding, redirect to dashboard
        console.log("Onboarding completed, redirecting to dashboard")
        return NextResponse.redirect(new URL("/mechanic/dashboard", request.url))
      }
    }

    // If we get here, allow the request to continue
    console.log("Middleware allowing request to continue")
    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // On error, allow the request to continue
    return NextResponse.next()
  }
}

// Helper function to get step number
function getStepNumber(step: string): string {
  switch (step) {
    case "personal_info":
      return "1"
    case "professional_info":
      return "2"
    case "certifications":
      return "3"
    case "rates":
      return "4"
    case "profile":
      return "5"
    default:
      return "1"
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    "/mechanic/dashboard/:path*",
    "/onboarding-mechanic-:path*",
  ],
}
