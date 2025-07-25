import { supabase } from '@/lib/supabase'

export interface SessionValidationResult {
  success: boolean
  user?: any
  session?: any
  error?: string
  errorCode?: string
}

/**
 * Comprehensive session persistence function for onboarding
 * Handles cookie clearing, session validation, and ensures proper session establishment
 */
export async function ensureOnboardingSession(): Promise<SessionValidationResult> {
  console.log('🔐 Ensuring onboarding session persistence...')
  
  try {
    // Step 1: Clear corrupted cookies first
    clearCorruptedCookies()
    
    // Step 2: Wait a moment for cookie clearing to take effect
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Step 3: Check for existing session
    const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession()
    
    if (sessionError) {
      console.error('❌ Session error during onboarding:', sessionError)
      return {
        success: false,
        error: 'Session error occurred',
        errorCode: 'SESSION_ERROR'
      }
    }

    if (session && session.user) {
      console.log('✅ Existing valid session found:', session.user.id)
      return {
        success: true,
        user: session.user,
        session
      }
    }

    // Step 4: If no session, try to refresh
    console.log('🔄 No session found, attempting to refresh...')
    const { data: { session: refreshedSession }, error: refreshError } = await (supabase.auth as any).refreshSession()
    
    if (refreshError) {
      console.error('❌ Session refresh failed:', refreshError)
      return {
        success: false,
        error: 'Session refresh failed',
        errorCode: 'REFRESH_ERROR'
      }
    }

    if (refreshedSession && refreshedSession.user) {
      console.log('✅ Session refreshed successfully:', refreshedSession.user.id)
      return {
        success: true,
        user: refreshedSession.user,
        session: refreshedSession
      }
    }

    console.log('❌ No valid session found after refresh')
    return {
      success: false,
      error: 'No valid session found',
      errorCode: 'NO_SESSION'
    }
    
  } catch (error) {
    console.error('❌ Error ensuring onboarding session:', error)
    return {
      success: false,
      error: 'Session persistence failed',
      errorCode: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Enhanced session validation with retry logic
 */
export async function validateSessionWithRetry(
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<SessionValidationResult> {
  console.log('🔐 Validating session with retry logic...')
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Session validation attempt ${attempt}/${maxRetries}`)
    
    const result = await validateSession()
    
    if (result.success) {
      console.log('✅ Session validation successful on attempt', attempt)
      return result
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Session validation failed, retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      
      // Clear cookies before retry
      clearCorruptedCookies()
    }
  }
  
  console.error('❌ Session validation failed after all retries')
  return {
    success: false,
    error: 'Session validation failed after retries',
    errorCode: 'RETRY_FAILED'
  }
}

/**
 * Wait for session to be established after signup/signin
 * This is crucial for preventing 406 errors in subsequent operations
 */
export async function waitForSession(
  maxAttempts: number = 10,
  delayMs: number = 500
): Promise<SessionValidationResult> {
  console.log('⏳ Waiting for session to be established...')
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔍 Session check attempt ${attempt}/${maxAttempts}`)
      
      // Check for session
      const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        return {
          success: false,
          error: 'Session error occurred',
          errorCode: 'SESSION_ERROR'
        }
      }

      if (session) {
        // Verify user exists
        const { data: { user }, error: userError } = await (supabase.auth as any).getUser()
        
        if (userError) {
          console.error('❌ User error:', userError)
          return {
            success: false,
            error: 'User validation failed',
            errorCode: 'USER_ERROR'
          }
        }

        if (user && user.id) {
          console.log('✅ Session established successfully:', user.id)
          return {
            success: true,
            user,
            session
          }
        }
      }

      // Wait before next attempt
      if (attempt < maxAttempts) {
        console.log(`⏳ Session not ready, waiting ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      
    } catch (error) {
      console.error('❌ Error checking session:', error)
      return {
        success: false,
        error: 'Session check failed',
        errorCode: 'UNKNOWN_ERROR'
      }
    }
  }

  console.error('❌ Session not established after maximum attempts')
  return {
    success: false,
    error: 'Session establishment timeout',
    errorCode: 'TIMEOUT'
  }
}

/**
 * Validate session before proceeding with profile operations
 */
export async function validateSession(): Promise<SessionValidationResult> {
  console.log('🔐 Validating current session...')
  
  try {
    // Check for valid session
    const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
      return {
        success: false,
        error: 'Session error occurred',
        errorCode: 'SESSION_ERROR'
      }
    }

    if (!session) {
      console.log('❌ No valid session found')
      return {
        success: false,
        error: 'No valid session found',
        errorCode: 'NO_SESSION'
      }
    }

    // Get current user
    const { data: { user }, error: userError } = await (supabase.auth as any).getUser()
    
    if (userError) {
      console.error('❌ User error:', userError)
      return {
        success: false,
        error: 'User authentication error',
        errorCode: 'USER_ERROR'
      }
    }

    if (!user || !user.id) {
      console.error('❌ No valid user or user ID')
      return {
        success: false,
        error: 'Invalid user',
        errorCode: 'INVALID_USER'
      }
    }

    console.log('✅ Valid session and user found:', user.id)
    return {
      success: true,
      user,
      session
    }
    
  } catch (error) {
    console.error('❌ Session validation failed:', error)
    return {
      success: false,
      error: 'Session validation failed',
      errorCode: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Ensure user is authenticated before proceeding
 * Redirects to login if not authenticated
 */
export async function ensureAuthenticated(redirectTo?: string): Promise<SessionValidationResult> {
  const result = await validateSession()
  
  if (!result.success) {
    console.log('🔐 User not authenticated, redirecting to login...')
    
    // Clear any corrupted session
    await (supabase.auth as any).signOut()
    
    // Redirect to login with return URL
    const loginUrl = redirectTo 
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : '/login'
    
    if (typeof window !== 'undefined') {
      window.location.href = loginUrl
    }
  }
  
  return result
}

/**
 * Handle signup with proper session waiting
 */
export async function handleSignupWithSession(
  email: string,
  password: string,
  metadata?: any
): Promise<SessionValidationResult> {
  console.log('👤 Starting signup process...')
  
  try {
    // Perform signup
    const { data, error } = await (supabase.auth as any).signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) {
      console.error('❌ Signup error:', error)
      return {
        success: false,
        error: error.message,
        errorCode: error.name
      }
    }

    if (!data.user) {
      console.error('❌ No user returned from signup')
      return {
        success: false,
        error: 'No user returned from signup',
        errorCode: 'NO_USER'
      }
    }

    console.log('✅ Signup successful, waiting for session...')
    
    // Wait for session to be established
    const sessionResult = await waitForSession()
    
    if (sessionResult.success) {
      console.log('🎉 Signup and session establishment completed')
    } else {
      console.error('❌ Session establishment failed after signup')
    }
    
    return sessionResult
    
  } catch (error) {
    console.error('❌ Unexpected error during signup:', error)
    return {
      success: false,
      error: 'Unexpected error during signup',
      errorCode: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Handle signin with proper session waiting
 */
export async function handleSigninWithSession(
  email: string,
  password: string
): Promise<SessionValidationResult> {
  console.log('🔐 Starting signin process...')
  
  try {
    // Perform signin
    const { data, error } = await (supabase.auth as any).signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ Signin error:', error)
      return {
        success: false,
        error: error.message,
        errorCode: error.name
      }
    }

    if (!data.user) {
      console.error('❌ No user returned from signin')
      return {
        success: false,
        error: 'No user returned from signin',
        errorCode: 'NO_USER'
      }
    }

    console.log('✅ Signin successful, waiting for session...')
    
    // Wait for session to be established
    const sessionResult = await waitForSession()
    
    if (sessionResult.success) {
      console.log('🎉 Signin and session establishment completed')
    } else {
      console.error('❌ Session establishment failed after signin')
    }
    
    return sessionResult
    
  } catch (error) {
    console.error('❌ Unexpected error during signin:', error)
    return {
      success: false,
      error: 'Unexpected error during signin',
      errorCode: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Get user-friendly error messages for session issues
 */
export function getSessionErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'NO_SESSION':
      return 'Please log in to continue'
    case 'SESSION_ERROR':
      return 'Session error. Please log in again'
    case 'USER_ERROR':
      return 'User authentication error. Please log in again'
    case 'INVALID_USER':
      return 'Invalid user. Please log in again'
    case 'TIMEOUT':
      return 'Session establishment timeout. Please try again'
    case 'NO_USER':
      return 'User creation failed. Please try again'
    default:
      return 'Authentication error. Please try again'
  }
}

/**
 * Clear corrupted session data including cookies, localStorage, and sessionStorage
 * Use this before any Supabase operations when experiencing session issues
 */
export function clearCorruptedSessionData(): void {
  console.log('🧹 Clearing corrupted session data...')
  
  if (typeof window !== 'undefined') {
    try {
      // Clear corrupted base64 cookies specifically
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        if (cookie.includes('base64-')) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
      
      // Clear all other cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('✅ Session data cleared successfully')
    } catch (error) {
      console.error('❌ Error clearing session data:', error)
    }
  } else {
    console.log('⚠️ Not in browser environment, skipping session data clearing')
  }
}

/**
 * Clear corrupted cookies before any auth operations
 * Specifically targets base64-encoded cookies that cause parsing errors
 */
export function clearCorruptedCookies(): void {
  console.log('🍪 Clearing corrupted cookies...')
  
  if (typeof window !== 'undefined') {
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        if (cookie.includes('base64-')) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          console.log(`🗑️ Cleared corrupted cookie: ${name}`);
        }
      });
      
      console.log('✅ Corrupted cookies cleared successfully')
    } catch (error) {
      console.error('❌ Error clearing corrupted cookies:', error)
    }
  } else {
    console.log('⚠️ Not in browser environment, skipping cookie clearing')
  }
}
