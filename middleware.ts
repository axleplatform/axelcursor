import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If there's no session and the user is trying to access protected routes
  if (!session && req.nextUrl.pathname.startsWith("/mechanic/dashboard")) {
    // Redirect to the login page
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify the paths that should be protected by the middleware
export const config = {
  matcher: ["/mechanic/dashboard/:path*"],
}
