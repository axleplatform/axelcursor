import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create a single supabase client for the browser with explicit cookie options
export const supabase = createClientComponentClient({
  options: {
    cookies: {
      name: "sb-auth-token",
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: process.env.NEXT_PUBLIC_DOMAIN || "",
      path: "/",
      sameSite: "lax"
    }
  }
})

// Export a function to get a fresh client instance with the same options
export const getSupabaseClient = () => createClientComponentClient({
  options: {
    cookies: {
      name: "sb-auth-token",
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: process.env.NEXT_PUBLIC_DOMAIN || "",
      path: "/",
      sameSite: "lax"
    }
  }
})
