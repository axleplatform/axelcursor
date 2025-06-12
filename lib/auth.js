// Clear all Supabase-related storage
export const clearOldSessions = () => {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    })
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        sessionStorage.removeItem(key)
      }
    })
  }
} 