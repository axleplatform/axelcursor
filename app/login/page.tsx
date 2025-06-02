// @ts-nocheck
"use client"

// Enhanced login flow with improved session handling and error logging - Deployment v2
import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const supabase = createClientComponentClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking session...")
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Session check error:", sessionError)
          return
        }

        console.log("Session data:", {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        })
        
        if (session) {
          // Check if user is a mechanic
          console.log("Checking mechanic profile for user:", session.user.id)
          const { data: mechanicProfile, error: profileError } = await supabase
            .from("mechanic_profiles")
            .select("onboarding_completed, onboarding_step")
            .eq("user_id", session.user.id)
            .single()

          console.log("Mechanic profile data:", mechanicProfile)
          console.log("Profile error:", profileError)

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error checking mechanic profile:", profileError)
            return
          }

          if (mechanicProfile) {
            console.log("Onboarding completed:", mechanicProfile.onboarding_completed)
            console.log("Onboarding step:", mechanicProfile.onboarding_step)
            
            if (mechanicProfile.onboarding_completed) {
              console.log("Redirecting to dashboard...")
              router.replace("/mechanic/dashboard")
            } else {
              // Redirect to appropriate onboarding step
              const step = mechanicProfile.onboarding_step || "personal_info"
              console.log("Redirecting to onboarding step:", step)
              router.replace(`/onboarding-mechanic-${getStepNumber(step)}`)
            }
          } else {
            // Check if this is a customer account
            console.log("Checking customer profile...")
            const { data: customerProfile } = await supabase
              .from("customer_profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .single()

            if (customerProfile) {
              console.log("Redirecting to customer dashboard...")
              router.replace("/dashboard")
            }
          }
        }
      } catch (error) {
        console.error("Session check error:", error)
      }
    }
    checkSession()
  }, [router, supabase])

  const getStepNumber = (step: string) => {
    switch (step) {
      case "personal_info": return "1"
      case "professional_info": return "2"
      case "certifications": return "3"
      case "rates": return "4"
      case "profile": return "5"
      default: return "1"
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("Starting login process for email:", email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Auth error during login:", error)
        throw error
      }

      if (!data.user) {
        console.error("No user data returned after login")
        throw new Error("No user data returned")
      }

      console.log("Login successful, user data:", {
        userId: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata
      })

      // More robust session verification with retries
      console.log("Starting session verification...")
      let retries = 5 // Increased retries
      let session = null
      
      while (retries > 0) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error("Session verification error:", sessionError)
          throw sessionError
        }
        
        if (currentSession) {
          session = currentSession
          console.log("Session verified on attempt", 6 - retries)
          break
        }
        
        console.log("Session not found, retrying...", { retriesLeft: retries - 1 })
        await new Promise(resolve => setTimeout(resolve, 1500)) // Increased delay
        retries--
      }

      if (!session) {
        console.error("Failed to establish session after retries")
        throw new Error("Failed to establish session")
      }

      console.log("Session state:", {
        hasSession: !!session,
        userId: session?.user?.id,
        cookies: document.cookie,
        timestamp: new Date().toISOString()
      })

      // Check if user is a mechanic
      console.log("Checking mechanic profile for user:", data.user.id)
      const { data: mechanicProfile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("user_id", data.user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error checking mechanic profile:", profileError)
        throw profileError
      }

      console.log("Mechanic profile check result:", mechanicProfile)

      // If user is a mechanic, redirect to appropriate page
      if (mechanicProfile) {
        if (!mechanicProfile.onboarding_completed) {
          const step = mechanicProfile.onboarding_step || "personal_info"
          console.log("Redirecting to onboarding step:", step)
          router.replace(`/onboarding-mechanic-${getStepNumber(step)}`)
        } else {
          console.log("Redirecting to mechanic dashboard")
          // Add a longer delay to ensure session is fully established
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.replace("/mechanic/dashboard")
        }
      } else {
        // For non-mechanics, redirect to home or specified redirect
        const redirectTo = searchParams.get("redirectedFrom") || "/"
        console.log("Redirecting to:", redirectTo)
        router.replace(redirectTo)
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmationEmail = async () => {
    if (!email) {
      setError("Please enter your email address to resend the confirmation email.")
      return
    }

    setIsResendingEmail(true)
    setError(null)
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      })

      if (error) {
        throw error
      }

      setResendSuccess(true)
    } catch (error: any) {
      console.error("Error resending confirmation email:", error)
      setError(error.message || "Failed to resend confirmation email. Please try again.")
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <SiteHeader />

      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Image src="/images/axle-logo-green.png" alt="Axle" width={120} height={48} priority />
          </div>

          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{" "}
              <Link
                href="/signup"
                className="text-[#294a46] font-medium transition-transform hover:scale-105 active:scale-95"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
              <p>{error}</p>
              {error.includes("email has not been confirmed") && (
                <button
                  onClick={handleResendConfirmationEmail}
                  disabled={isResendingEmail}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 focus:outline-none underline"
                >
                  {isResendingEmail ? "Sending..." : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}

          {/* Success message for resending confirmation email */}
          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
              <p>Confirmation email has been sent! Please check your inbox and spam folder.</p>
            </div>
          )}

          {/* Login form */}
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-lg font-medium text-gray-900 mb-1 tracking-tight">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900 tracking-tight"
                placeholder="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-medium text-gray-900 mb-1 tracking-tight">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900 tracking-tight"
                placeholder="Password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#294a46] focus:ring-[#294a46]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 tracking-tight">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[#294a46] tracking-tight transition-transform hover:scale-105 active:scale-95"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#294a46] tracking-tight transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </div>
          </form>

          {/* Social Login Button */}
          <div>
            <button
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white tracking-tight transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={async () => {
                try {
                  setIsLoading(true)
                  setError(null)
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `${window.location.origin}/onboarding/mechanic/auth-callback?user_type=mechanic`,
                    },
                  })
                  if (error) throw error
                } catch (error: any) {
                  console.error("Google login error:", error)
                  setError(error.message || "Failed to login with Google. Please try again.")
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
        </div>
        <Footer />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
