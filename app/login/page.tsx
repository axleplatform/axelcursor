"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/client"
=======
import { createBrowserClient } from '@supabase/ssr'
>>>>>>> main

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

<<<<<<< HEAD
  // Create Supabase client
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
=======
  const handleLogin = async (e: React.FormEvent): Promise<void> => {
>>>>>>> main
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("🔑 Starting login process...")
      
      if (!email || !password) {
        throw new Error("Please enter both email and password")
      }

      const { data, error: signInError } = await createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ).auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        console.error("❌ Auth error:", signInError)
        throw signInError
      }

      if (!data.user) {
        throw new Error("Login failed - no user data received")
      }

<<<<<<< HEAD
      console.log("✅ Login successful, user:", user.id)

      // Check if user has a mechanic profile
      const { data: mechanicProfile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("id, onboarding_completed, onboarding_step")
        .eq("user_id", user.id)
        .maybeSingle()
=======
      console.log("✅ Login successful, user:", data.user.id)
      
      // Check if this is a mechanic
      const { data: profile } = await createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ).from('mechanic_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single()
>>>>>>> main

      if (profile) {
        router.push('/mechanic/dashboard')
      } else {
<<<<<<< HEAD
        // Check if this is a customer account
        const { data: customerProfile } = await supabase
          .from("customer_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()

        if (customerProfile) {
          console.log("✅ Customer profile found:", customerProfile.id)
          router.replace("/dashboard")
        } else {
          throw new Error("No profile found. Please complete registration.")
        }
=======
        router.push('/')
>>>>>>> main
      }
    } catch (error: unknown) {
      console.error("❌ Error:", error)
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

<<<<<<< HEAD
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

  const handleResendConfirmationEmail = async () => {
=======
  const handleResendConfirmationEmail = async (): Promise<void> => {
>>>>>>> main
    if (!email) {
      setError("Please enter your email address first")
      return
    }

    setIsResendingEmail(true)
    try {
      const { error } = await createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ).auth.resend({
        type: 'signup',
        email: email.trim(),
      })

      if (error) {
        throw error
      }

      setError("")
      setResendSuccess(true)
    } catch (error: unknown) {
      console.error("❌ Error:", error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend confirmation email'
      setError(errorMessage)
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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

          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
              <p>Confirmation email has been sent! Please check your inbox and spam folder.</p>
            </div>
          )}

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
                className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#294a46] sm:text-sm sm:leading-6"
                placeholder="Enter your email"
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
                className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#294a46] sm:text-sm sm:leading-6"
                placeholder="Enter your password"
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
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="text-[#294a46] font-medium hover:text-[#1a2f2c] transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-md bg-[#294a46] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1a2f2c] focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
