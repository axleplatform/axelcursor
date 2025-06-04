import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// This middleware ensures proper session handling and route protection
export async function middleware(request: NextRequest) {
  try {
    console.log("🔒 Middleware executing for path:", request.nextUrl.pathname)
    console.log("🔍 Request headers:", Object.fromEntries(request.headers.entries()))
    
    // Create a Supabase client configured to use cookies
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Check for any Supabase session cookie
    const cookies = request.cookies
    const cookieDetails = {
      hasAuthToken: cookies.has("sb-auth-token"),
      hasAuthTokenClient: cookies.has("sb-auth-token-client"),
      hasAccessToken: cookies.has("sb-access-token"),
      hasRefreshToken: cookies.has("sb-refresh-token"),
      allCookies: Object.fromEntries(cookies.entries())
    }
    
    console.log("🍪 Cookie check in middleware:", cookieDetails)

    // If there's no session cookie and trying to access protected routes, redirect to login
    const hasSessionCookie = cookieDetails.hasAuthToken || 
                           cookieDetails.hasAuthTokenClient ||
                           cookieDetails.hasAccessToken ||
                           cookieDetails.hasRefreshToken
    
    console.log("🔑 Session check result:", { hasSessionCookie })

    const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic/") ||
      request.nextUrl.pathname.startsWith("/onboarding-mechanic-")

    if (!hasSessionCookie && isProtectedRoute) {
      console.log("🚫 Protected route accessed without session, redirecting to login")
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (!hasSessionCookie) {
      console.log("✅ Non-protected route, proceeding without session")
      return res
    }

    // Verify session with Supabase
    console.log("🔄 Starting session verification...")
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error("❌ Session verification error:", sessionError)
      // In development, allow the request to proceed even if there's a session error
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ Development mode: Allowing request despite session error")
        return res
      }
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("error", "Session verification failed")
      return NextResponse.redirect(redirectUrl)
    }

    if (!session) {
      console.log("❌ No valid session found")
      // In development, allow the request to proceed even if there's no session
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ Development mode: Allowing request despite no session")
        return res
      }
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("error", "Session expired")
      return NextResponse.redirect(redirectUrl)
    }

    console.log("✅ Session verified:", {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at
    })

    // Session is valid, set cookies
    console.log("🔐 Setting session cookies for user:", session.user.id)
    
    // Set both httpOnly and non-httpOnly cookies for better compatibility
    res.cookies.set("sb-auth-token", session.access_token, {
      path: "/",
      httpOnly: true,
      secure: false, // Allow non-secure in development
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    // Also set a non-httpOnly cookie for client-side access
    res.cookies.set("sb-auth-token-client", session.access_token, {
      path: "/",
      secure: false, // Allow non-secure in development
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    // Add a timestamp cookie to track session age
    res.cookies.set("sb-session-timestamp", new Date().toISOString(), {
      path: "/",
      secure: false, // Allow non-secure in development
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    console.log("✅ Session cookies set successfully")
    return res
  } catch (error) {
    console.error("❌ Middleware error:", error)
    // In development, allow the request to proceed even if there's an error
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ Development mode: Allowing request despite error")
      return NextResponse.next()
    }
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
