import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Don't redirect on login page if already going there
  if (request.nextUrl.pathname === '/login') {
    if (session) {
      // User is logged in, redirect away from login
      return NextResponse.redirect(new URL('/mechanic/dashboard', request.url));
    }
    return response;
  }

  // Protect mechanic routes
  if (request.nextUrl.pathname.startsWith('/mechanic')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/login',
    '/mechanic/:path*',
    '/mechanic-dashboard/:path*'
  ],
}; 