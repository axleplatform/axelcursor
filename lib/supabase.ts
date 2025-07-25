import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Global variable to store the singleton instance
let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new instance only if none exists
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseInstance
}

// Export the singleton instance
export const supabase = createClient()!

// Export a function to get a fresh client instance (if needed)
export const getSupabaseClient = () => createClient()

// Function to clear the singleton instance (useful for testing or resetting)
export const clearSupabaseInstance = () => {
  supabaseInstance = null
}
