'use client'

import { useEffect } from 'react'

export default function CookieCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🍪 CookieCleaner: Starting cookie cleanup...')
      
      // Helper function to check if a cookie is a valid Supabase auth cookie
      const isSupabaseAuthCookie = (cookieName: string) => {
        return cookieName.includes('auth-token') && cookieName.startsWith('sb-');
      };
      
      // Clear base64-encoded cookies that cause parsing errors
      const cookies = document.cookie.split(';');
      let clearedCount = 0;
      
      cookies.forEach(cookie => {
        if (cookie.includes('base64-')) {
          const name = cookie.split('=')[0].trim();
          
          // Don't clear if it's a valid Supabase auth cookie
          if (!isSupabaseAuthCookie(name)) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            console.log(`🗑️ CookieCleaner: Cleared corrupted cookie: ${name}`);
            clearedCount++;
          } else {
            console.log(`🛡️ CookieCleaner: Preserved valid Supabase auth cookie: ${name}`);
          }
        }
      });
      
      // Note: Removed the blanket clearing of Supabase cookies to preserve valid auth tokens
      // Only clear corrupted base64 cookies, not valid Supabase auth cookies
      
      console.log(`✅ CookieCleaner: Cleanup complete. Cleared ${clearedCount} corrupted cookies. Preserved Supabase auth cookies.`);
    }
  }, []);

  return null;
}
