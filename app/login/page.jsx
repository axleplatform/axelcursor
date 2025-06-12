"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check if already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get mechanic profile
        const { data: profile } = await supabase
          .from('mechanic_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (profile) {
          console.log('✅ Mechanic profile found, redirecting to dashboard')
          window.location.href = '/mechanic/dashboard'
        } else {
          console.log('✅ Regular user, redirecting to dashboard')
          window.location.href = '/dashboard'
        }
      }
    }
    
    checkUser()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      window.location.href = "/mechanic/dashboard"
      
    } catch (error) {
      console.error("Error logging in:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to log in. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearAllSessions = () => {
    // Clear everything
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    })
    
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow bg-[#f5f5f5]">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Welcome Back</h1>
              <p className="text-lg text-gray-600 mt-1">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#294a46] hover:bg-[#1e3632] text-white"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button 
                onClick={clearAllSessions}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All Sessions (Debug)
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 