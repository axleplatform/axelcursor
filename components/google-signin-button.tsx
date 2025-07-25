"use client"

import React from 'react'
import { supabase } from '@/lib/supabase'

interface GoogleSignInButtonProps {
  userType?: 'customer' | 'mechanic'
  from?: 'appointment'
  appointmentId?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export function GoogleSignInButton({ 
  userType, 
  from, 
  appointmentId, 
  className = "",
  disabled = false,
  children 
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleGoogleSignIn = async () => {
    if (disabled) return; // Prevent action when disabled
    
    setIsLoading(true)
    
    try {
      // Save current onboarding data to localStorage if on onboarding flow
      const currentPath = window.location.pathname;
      if (currentPath.includes('/onboarding/customer/flow')) {
        const onboardingData = localStorage.getItem('onboardingData');
        if (onboardingData) {
          localStorage.setItem('pendingOnboarding', onboardingData);
        }
      }
      
      // Build redirect URL with parameters
      let redirectUrl = `${window.location.origin}/auth/callback`
      const params = new URLSearchParams()
      
      if (userType) {
        params.append('userType', userType)
      }
      
      if (from) {
        params.append('from', from)
      }
      
      if (appointmentId) {
        params.append('appointment', appointmentId)
      }
      
      if (params.toString()) {
        redirectUrl += `?${params.toString()}`
      }

      const { error } = await (supabase.auth as any).signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      })

      if (error) {
        console.error('Google OAuth error:', error)
        throw error
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading || disabled}
      className={`
        w-full flex items-center justify-center gap-3 px-4 py-3 
        border border-gray-300 rounded-md shadow-sm 
        bg-white text-gray-700 font-medium
        hover:bg-gray-50 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-[#294a46]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285f4] rounded-full animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285f4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34a853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fbbc05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#ea4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {children || 'Sign in with Google'}
        </>
      )}
    </button>
  )
}
