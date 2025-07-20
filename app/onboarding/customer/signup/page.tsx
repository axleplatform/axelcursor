"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Loader2, X, Clock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { GoogleSignInButton } from "@/components/google-signin-button"

interface CustomerSignupPageProps {
  isOnboarding?: boolean;
  onboardingData?: any;
  onSuccess?: (userId: string) => void;
}

export default function CustomerSignupPage({ 
  isOnboarding = false, 
  onboardingData, 
  onSuccess 
}: CustomerSignupPageProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)

  // Validate email format
  const isEmailValid = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate password strength
  const isPasswordValid = (password: string) => {
    return password.length >= 8
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent multiple submissions
    if (isLoading) return

    // Validate inputs
    if (!isEmailValid(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!isPasswordValid(password)) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: "customer",
          },
        },
      })

      if (signUpError) {
        // Check for rate limit errors
        if (
          signUpError.message.toLowerCase().includes("rate limit") ||
          signUpError.message.toLowerCase().includes("too many requests") ||
          signUpError.message.toLowerCase().includes("exceeded")
        ) {
          console.warn("Rate limit hit during signup:", signUpError.message)
          setIsRateLimited(true)
          setError("Too many signup attempts. Please wait a few minutes and try again.")
        } else {
          throw signUpError
        }
        return
      }

      if (data.user) {
        // Create a customer profile in the database
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            email: email,
            role: "customer",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ])

        if (profileError) throw profileError

        // Handle success based on context
        if (isOnboarding && onSuccess) {
          // Continue onboarding flow
          onSuccess(data.user.id)
        } else {
          // Normal redirect to home page
          router.push("/")
        }
      }
    } catch (error: unknown) {
      console.error("Error during signup:", error)

      // Check for rate limit errors in the caught error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (
        errorMessage &&
        (errorMessage.toLowerCase().includes("rate limit") ||
          errorMessage.toLowerCase().includes("too many requests") ||
          errorMessage.toLowerCase().includes("exceeded"))
      ) {
        console.warn("Rate limit hit during signup:", errorMessage)
        setIsRateLimited(true)
        setError("Too many signup attempts. Please wait a few minutes and try again.")
      } else {
        setError(errorMessage || "An error occurred during signup. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Image
              src="/images/axle-logo-green.png"
              alt="Axle"
              width={120}
              height={48}
              className="mx-auto object-contain"
              priority
            />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Create Your Account</h2>
            <p className="mt-2 text-sm text-gray-600">Join thousands of car owners who trust Axle for their repairs</p>
          </div>

          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {isRateLimited && (
              <div
                className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md"
                role="alert"
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-amber-600" />
                  <p className="font-medium">Rate limit reached</p>
                </div>
                <p className="mt-1">Too many signup attempts. Please wait a few minutes before trying again.</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && !isRateLimited && (
                <div
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start"
                  role="alert"
                >
                  <X className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="block">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[#294a46] focus:outline-none focus:ring-[#294a46] sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="you@example.com"
                    disabled={isLoading || isRateLimited}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[#294a46] focus:outline-none focus:ring-[#294a46] sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="••••••••"
                    disabled={isLoading || isRateLimited}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isRateLimited}
                  >
                    {showPassword ? <div className="h-4 w-4">🙈</div> : <div className="h-4 w-4">👁️</div>}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || isRateLimited}
                  className="flex w-full justify-center rounded-md border border-transparent bg-[#294a46] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Creating account...
                    </>
                  ) : isRateLimited ? (
                    "Please wait before trying again"
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <GoogleSignInButton 
                  userType="customer"
                  disabled={isLoading || isRateLimited}
                >
                  Continue with Google
                </GoogleSignInButton>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-[#294a46] hover:text-[#1e3632]">
                  Sign in
                </Link>
              </p>
              {!isOnboarding && (
                <p className="text-gray-600 mt-2">
                  Or{" "}
                  <Link href="/onboarding/customer/flow" className="font-medium text-[#294a46] hover:text-[#1e3632]">
                    start the guided onboarding
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              By creating an account, you agree to our{" "}
              <Link href="/legal/terms" className="font-medium text-[#294a46] hover:text-[#1e3632]">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="font-medium text-[#294a46] hover:text-[#1e3632]">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
