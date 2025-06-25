"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("🔑 Starting login process...")
      
      // Create Supabase client for auth operations
      const supabaseClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Sign in with password using SSR client
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("❌ Auth error:", signInError)
        throw signInError
      }

      if (!data?.user) {
        throw new Error("No user data returned")
      }

      console.log("✅ Login successful, user:", data.user.id)

      // Refresh the router to sync session state
      router.refresh()
      
      // Use Next.js router for navigation
      router.push('/mechanic/dashboard')

    } catch (error: any) {
      console.error("❌ Error:", error)
      setError(error.message || "Failed to log in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmationEmail = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsResendingEmail(true)
    setError(null)

    try {
      // Create Supabase client for auth operations
      const supabaseClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email,
      })

      if (error) throw error

      setResendSuccess(true)
    } catch (error: any) {
      setError(error.message)
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
