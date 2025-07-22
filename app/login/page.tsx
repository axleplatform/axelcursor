"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { GoogleSignInButton } from "@/components/google-signin-button"
import { redirectToCorrectDashboard } from "@/lib/auth-helpers"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("🔑 Starting login process...")
      
      if (!email || !password) {
        throw new Error("Please enter both email and password")
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
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

      console.log("✅ Login successful, user:", data.user.id)
      
      // Add a small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force refresh the session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Use the redirectToCorrectDashboard function
        await redirectToCorrectDashboard(router)
      } else {
        console.error("❌ No session after login")
        setError("Login successful but session not established. Please try again.")
      }
    } catch (error: unknown) {
      console.error("❌ Error:", error)
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmationEmail = async (): Promise<void> => {
    if (!email) {
      setError("Please enter your email address first")
      return
    }

    setIsResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
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


          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#294a46]">Sign in to your account</h2>
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <GoogleSignInButton userType="customer">
              Sign in with Google
            </GoogleSignInButton>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
