import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// Updated to use modern Supabase SSR approach
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    console.log("🔒 Middleware executing for path:", request.nextUrl.pathname)
    
    // Create a Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Handle root path - redirect to welcome page
    if (request.nextUrl.pathname === '/') {
      console.log("🔄 Redirecting root to welcome page")
      return NextResponse.redirect(new URL('/welcome', request.url))
    }

    // Handle welcome page - allow ALL users to access
    if (request.nextUrl.pathname === '/welcome') {
      // Allow access to welcome page for all users
      return response
    }

    const isProtectedRoute = request.nextUrl.pathname.startsWith("/mechanic/") ||
      request.nextUrl.pathname.startsWith("/onboarding-mechanic-") ||
      request.nextUrl.pathname.startsWith("/customer-dashboard")

    if (!isProtectedRoute) {
      return response
    }

    // Verify session with Supabase
    const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession()
    
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

    // Handle customer dashboard access
    if (request.nextUrl.pathname.startsWith("/customer-dashboard")) {
      console.log("✅ Allowing access to customer dashboard for authenticated user:", session.user.id)
      return response
    }

    // TEMPORARY FIX: Allow access to mechanic dashboard for all authenticated users
    if (request.nextUrl.pathname.startsWith("/mechanic/")) {
      console.log("✅ Allowing access to mechanic dashboard for authenticated user:", session.user.id)
      return response
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

    console.log("✅ Session validated for user:", session.user.id)
    return response
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
    "/",
    "/welcome",
    "/order-service",
    "/mechanic/:path*",
    "/onboarding-mechanic-:path*",
    "/customer-dashboard/:path*"
  ]
}
