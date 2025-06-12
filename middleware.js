import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes
  if (request.nextUrl.pathname.startsWith('/mechanic')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === '/login' && session) {
    // Check if mechanic
    const { data: mechanicProfile } = await supabase
      .from('mechanic_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (mechanicProfile) {
      return NextResponse.redirect(new URL('/mechanic/dashboard', request.url))
    }
    
    // Regular user
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    '/mechanic/:path*',
    '/login',
    '/dashboard/:path*'
  ]
} 