import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create a single supabase client for the browser
export const supabase = createClientComponentClient()

// Export a function to get a fresh client instance
export const getSupabaseClient = () => createClientComponentClient()
