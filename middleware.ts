import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware for handling authentication and protected routes
// This middleware ensures proper session handling and route protection
export async function middleware(req: NextRequest) {
  console.log("Middleware executing for path:", req.nextUrl.pathname)
  console.log("Request headers:", Object.fromEntries(req.headers.entries()))

  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    // Check session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    console.log("Session check in middleware:", {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError?.message,
      path: req.nextUrl.pathname
    })

    // Set session cookie if we have a session
    if (session) {
      console.log("Setting session cookie in middleware")
      res.cookies.set('supabase-auth-token', session.access_token, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    // Protected routes
    const protectedRoutes = ['/mechanic/dashboard', '/mechanic/profile']
    const isProtectedRoute = protectedRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )

    if (isProtectedRoute) {
      console.log("Checking protected route access:", req.nextUrl.pathname)
      
      if (!session) {
        console.log("No session found, redirecting to login")
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user is a mechanic
      const { data: profile, error: profileError } = await supabase
        .from('mechanic_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      console.log("Mechanic profile check in middleware:", {
        hasProfile: !!profile,
        error: profileError?.message
      })

      if (!profile) {
        console.log("No mechanic profile found, redirecting to onboarding")
        return NextResponse.redirect(new URL('/onboarding-mechanic-1', req.url))
      }
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    return NextResponse.next()
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/mechanic/:path*",
    "/onboarding-mechanic-:path*"
  ]
}
