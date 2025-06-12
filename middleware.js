import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Create a response object first
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create supabase client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Set cookie on the response
          response.cookies.set({
            name,
            value,
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
          })
        },
        remove(name, options) {
          // Remove cookie from the response
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 0
          })
        },
      },
    }
  )

  try {
    // Get the session
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Session error:", error)
      return response
    }

    // Handle login page - redirect if already logged in
    if (request.nextUrl.pathname === '/login') {
      if (session) {
        return NextResponse.redirect(new URL('/mechanic/dashboard', request.url))
      }
      return response
    }

    // Protect mechanic routes
    if (request.nextUrl.pathname.startsWith('/mechanic')) {
      if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 