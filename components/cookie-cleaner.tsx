'use client'

import { useEffect } from 'react'

export default function CookieCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🍪 CookieCleaner: Starting cookie cleanup...')
      
      // Clear base64-encoded cookies that cause parsing errors
      const cookies = document.cookie.split(';');
      let clearedCount = 0;
      
      cookies.forEach(cookie => {
        if (cookie.includes('base64-')) {
          const name = cookie.split('=')[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          console.log(`🗑️ CookieCleaner: Cleared corrupted cookie: ${name}`);
          clearedCount++;
        }
      });
      
      // Also clear any Supabase-related cookies that might be corrupted
      const supabaseCookies = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];
      supabaseCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
      
      console.log(`✅ CookieCleaner: Cleanup complete. Cleared ${clearedCount} corrupted cookies.`);
    }
  }, []);

  return null;
}
