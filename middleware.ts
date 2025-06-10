import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// This middleware ensures proper session handling and route protection
// Last updated: 2024-06-04 - Simplified for temporary mechanic dashboard access
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
    
    if (sessionError) {
      console.error("❌ Session verification error:", sessionError)
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("error", "Session verification failed")
      return NextResponse.redirect(redirectUrl)
    }

    if (!session) {
      console.log("❌ No valid session found")
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("error", "Session expired")
      return NextResponse.redirect(redirectUrl)
    }

    // TEMPORARY FIX: Allow access to mechanic dashboard for all authenticated users
    if (request.nextUrl.pathname.startsWith("/mechanic/")) {
      console.log("✅ Allowing access to mechanic dashboard for authenticated user:", session.user.id)
      
      // Set session cookies
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
    }

    // For other protected routes, verify mechanic profile
    if (request.nextUrl.pathname.startsWith("/onboarding-mechanic-")) {
      const { data: profile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        console.error("❌ Error checking mechanic profile:", profileError)
        const redirectUrl = new URL("/login", request.url)
        redirectUrl.searchParams.set("error", "Profile verification failed")
        return NextResponse.redirect(redirectUrl)
      }

      if (!profile) {
        console.log("❌ No mechanic profile found")
        const redirectUrl = new URL("/login", request.url)
        redirectUrl.searchParams.set("error", "No mechanic profile found")
        return NextResponse.redirect(redirectUrl)
      }

      if (!profile.onboarding_completed) {
        console.log("🔄 Redirecting to onboarding")
        return NextResponse.redirect(new URL("/onboarding-mechanic-1", request.url))
      }
    }

    // Set session cookies for other routes
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

    console.log("✅ Session validated for user:", session.user.id)
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
