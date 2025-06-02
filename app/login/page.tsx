"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    console.log("Login page mounted, checking initial session...")
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log("Initial session check:", { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        })

        if (session) {
          console.log("Session found, checking user profile...")
          const { data: profile, error: profileError } = await supabase
            .from("mechanic_profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single()

          console.log("Profile check result:", { 
            hasProfile: !!profile, 
            error: profileError?.message 
          })

          if (profile) {
            console.log("Redirecting to mechanic dashboard...")
            router.push("/mechanic/dashboard")
          } else {
            console.log("No mechanic profile found, redirecting to onboarding...")
            router.push("/onboarding-mechanic-1")
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
      }
    }

    checkSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    console.log("Login attempt started for email:", email)

    try {
      // Sign in with Supabase
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("Sign in result:", { 
        success: !!session, 
        error: signInError?.message,
        userId: session?.user?.id 
      })

      if (signInError) {
        throw signInError
      }

      if (!session) {
        throw new Error("No session established after login")
      }

      // Wait for session to be established
      console.log("Waiting for session establishment...")
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify session was established
      const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession()
      console.log("Session verification:", { 
        hasSession: !!verifiedSession, 
        error: verifyError?.message 
      })

      if (!verifiedSession) {
        throw new Error("Session verification failed")
      }

      // Check if user is a mechanic
      console.log("Checking mechanic profile...")
      const { data: profile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("*")
        .eq("user_id", verifiedSession.user.id)
        .single()

      console.log("Profile check:", { 
        hasProfile: !!profile, 
        error: profileError?.message 
      })

      if (profileError) {
        throw profileError
      }

      if (!profile) {
        console.log("No mechanic profile found, redirecting to onboarding...")
        router.push("/onboarding-mechanic-1")
        return
      }

      // Set session cookie
      console.log("Setting session cookie...")
      document.cookie = `supabase-auth-token=${verifiedSession.access_token}; path=/`

      console.log("Login successful, redirecting to dashboard...")
      router.push("/mechanic/dashboard")

    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      })
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
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
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
