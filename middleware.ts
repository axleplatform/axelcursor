import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// This middleware ensures proper session handling and route protection
// Last updated: 2024-06-04 - Fixed cookie handling and session verification
export async function middleware(request: NextRequest) {
  try {
    console.log("🔒 Middleware executing for path:", request.nextUrl.pathname)
    
    // Create a Supabase client configured to use cookies
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Check for session cookie
    const hasSessionCookie = request.cookies.has("sb-auth-token") || 
                           request.cookies.has("sb-auth-token-client")

    const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic/") ||
      request.nextUrl.pathname.startsWith("/onboarding-mechanic-")

    if (!hasSessionCookie && isProtectedRoute) {
      console.log("🚫 Protected route accessed without session, redirecting to login")
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (!hasSessionCookie) {
      return res
    }

    // Verify session with Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.log("❌ Invalid session, redirecting to login")
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("error", "Session expired")
      return NextResponse.redirect(redirectUrl)
    }

    // Session is valid, set cookies
    res.cookies.set("sb-auth-token", session.access_token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    res.cookies.set("sb-auth-token-client", session.access_token, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    return res
  } catch (error) {
    console.error("❌ Middleware error:", error)
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("error", "Internal server error")
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
