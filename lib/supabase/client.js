import { createBrowserClient } from '@supabase/ssr'

let client

export function createClient() {
  if (client) return client
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        name: "sb-auth-token",
        lifetime: 60 * 60 * 24 * 7, // 1 week
        domain: process.env.NEXT_PUBLIC_DOMAIN || "",
        path: "/",
        sameSite: "lax"
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
  
  return client
} 