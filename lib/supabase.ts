import { createBrowserClient, SupabaseClient } from '@supabase/ssr'

// Create singleton instance
let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabaseInstance;
}

// Export the singleton instance
export const supabase = createSupabaseClient();

// Export a function to get a fresh client instance (if needed)
export const getSupabaseClient = () => createSupabaseClient();
