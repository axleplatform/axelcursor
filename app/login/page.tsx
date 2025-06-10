"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("🔍 Checking session...")
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          console.log("✅ Session found, checking user type...")
          
          // Check if user is a mechanic
          const { data: mechanicProfile, error: profileError } = await supabase
            .from("mechanic_profiles")
            .select("onboarding_completed, onboarding_step")
            .eq("user_id", session.user.id)
            .single()

          if (profileError && profileError.code !== "PGRST116") {
            console.error("❌ Error checking mechanic profile:", profileError)
            return
          }

          if (mechanicProfile) {
            if (mechanicProfile.onboarding_completed) {
              console.log("✅ Mechanic profile complete, redirecting to dashboard")
              router.replace("/mechanic/dashboard")
            } else {
              const step = mechanicProfile.onboarding_step || "personal_info"
              console.log("🔄 Redirecting to onboarding step:", step)
              router.replace(`/onboarding-mechanic-${getStepNumber(step)}`)
            }
            return
          }

          // Check if this is a customer account
          const { data: customerProfile } = await supabase
            .from("customer_profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .single()

          if (customerProfile) {
            console.log("✅ Customer profile found, redirecting to dashboard")
            router.replace("/dashboard")
          }
        }
      } catch (error) {
        console.error("❌ Session check error:", error)
      }
    }
    checkSession()
  }, [router])

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
      console.log("🔑 Starting login process...")
      
      // Sign in with password
      const { data: { session, user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("❌ Auth error:", signInError)
        throw signInError
      }

      if (!user) {
        throw new Error("No user data returned")
      }

      console.log("✅ Login successful, user:", user.id)

      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify session is established
      const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession()
      
      if (verifyError || !verifiedSession) {
        console.error("❌ Session verification failed:", verifyError)
        throw new Error("Failed to establish session")
      }

      console.log("✅ Session verified:", verifiedSession.user.id)

      // Set session cookies
      document.cookie = `sb-auth-token=${verifiedSession.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`
      document.cookie = `sb-auth-token-client=${verifiedSession.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`

      // Force redirect to mechanic dashboard
      console.log("🔄 Forcing redirect to mechanic dashboard")
      window.location.replace("/mechanic/dashboard")

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
      const { error } = await supabase.auth.resend({
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#294a46] focus:border-[#294a46] focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#294a46] focus:border-[#294a46] focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
