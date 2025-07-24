'use client'

import { useEffect } from 'react'

export default function CookieCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        if (cookie.includes('base64-')) {
          const name = cookie.split('=')[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
  }, []);

  return null;
}
