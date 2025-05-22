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
