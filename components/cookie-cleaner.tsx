'use client';

import { useEffect } from 'react';

// Helper function to identify valid Supabase auth cookies
const isSupabaseAuthCookie = (cookieName: string) => {
  return cookieName.includes('auth-token') && cookieName.startsWith('sb-');
};

export default function CookieCleaner() {
  useEffect(() => {
    const cleanCorruptedCookies = () => {
      try {
        console.log('🧹 Cookie cleaner: Starting cleanup...');
        
        const cookies = document.cookie.split(';');
        let clearedCount = 0;
        
        // Clear base64-encoded cookies that cause parsing errors
        cookies.forEach(cookie => {
          if (cookie.includes('base64-')) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Don't clear if it's a valid Supabase auth cookie
            if (!isSupabaseAuthCookie(name)) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              console.log(`🗑️ Cleared corrupted cookie: ${name}`);
              clearedCount++;
            } else {
              console.log(`🛡️ Preserved valid Supabase auth cookie: ${name}`);
            }
          }
        });
        
        // Clear all other cookies except Supabase auth cookies
        document.cookie.split(";").forEach(function(c) {
          const name = c.replace(/^ +/, "").replace(/=.*/, "");
          
          // Don't clear valid Supabase auth cookies
          if (!isSupabaseAuthCookie(name)) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          }
        });
        
        console.log(`✅ Cookie cleaner: Cleared ${clearedCount} corrupted cookies`);
      } catch (error) {
        console.error('❌ Cookie cleaner error:', error);
      }
    };

    // Run cleanup on mount
    cleanCorruptedCookies();
    
    // Set up periodic cleanup (every 5 minutes) but be more conservative
    const interval = setInterval(() => {
      // Only clean if there are obvious corrupted cookies
      const cookies = document.cookie.split(';');
      const hasCorruptedCookies = cookies.some(cookie => 
        cookie.includes('base64-') && !isSupabaseAuthCookie(cookie.trim())
      );
      
      if (hasCorruptedCookies) {
        console.log('🧹 Cookie cleaner: Periodic cleanup triggered');
        cleanCorruptedCookies();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, []);

  return null;
}
