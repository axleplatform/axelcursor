import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// This middleware ensures proper session handling and route protection
export async function middleware(request: NextRequest) {
  try {
    console.log("Middleware executing for path:", request.nextUrl.pathname)
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))
    
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
      cookies: Object.fromEntries(request.cookies.entries())
    })

    // If there's no session and trying to access protected routes, redirect to login
    if (!session) {
      console.log("No session found, checking if path is protected")
      const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic/") ||
        request.nextUrl.pathname.startsWith("/onboarding-mechanic-")

      if (isProtectedRoute) {
        console.log("Protected route accessed without session, redirecting to login")
        const redirectUrl = new URL("/login", request.url)
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // Add session cookie to response if it exists
    if (session) {
      console.log("Setting session cookies for user:", session.user.id)
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

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/mechanic/:path*",
    "/onboarding-mechanic-:path*"
  ]
}
