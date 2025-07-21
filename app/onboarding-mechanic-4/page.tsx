"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Check } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function MechanicOnboardingStep4Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const { toast } = useToast()

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          // Not authenticated, redirect to signup
          router.push("/onboarding/mechanic/signup")
          return
        }

        setUser(user)
      } catch (error: any) {
        console.error("Auth check error:", error)
        setError("Authentication error. Please try logging in again.")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Handle continue to next step
  const handleContinue = async () => {
    if (!user) {
      setError("You must be logged in to continue")
      router.push("/onboarding/mechanic/signup")
      return
    }

    setIsSaving(true)

    try {
      // Update user metadata to mark this step as complete
      await supabase.auth.updateUser({
        data: {
          onboarding_step: "step_4_complete",
        },
      })

      toast({
        title: "Step completed",
        description: "Moving to the next step of your onboarding.",
      })

      // Redirect to next step
      router.push("/onboarding-mechanic-5")
    } catch (error: any) {
      console.error("Error updating step:", error)
      setError("Failed to update your progress. Please try again.")

      toast({
        title: "Error",
        description: "There was a problem updating your progress.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#294a46] mx-auto mb-4" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />

      <main className="flex-1 py-4 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-3">
            <button
              onClick={() => router.back()}
              className="mr-2 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Onboarding Header with Progress Tracker */}
          <OnboardingHeader currentStep={4} subtitle="What you'll get with Axle" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <div className="px-6 py-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Axle!</h2>
                <p className="text-gray-600">Here's what you can expect as a mobile mechanic on our platform</p>
              </div>

              {/* Checkmarks Section */}
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                    <Check className="h-5 w-5 text-[#294a46]" />
                  </div>
                  <span className="text-lg font-medium text-gray-800">Quicker Appointment Booking</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                    <Check className="h-5 w-5 text-[#294a46]" />
                  </div>
                  <span className="text-lg font-medium text-gray-800">Visualize various live quotes</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full" style={{ backgroundColor: "#F9F9F9" }}>
                    <Check className="h-5 w-5 text-[#294a46]" />
                  </div>
                  <span className="text-lg font-medium text-gray-800">Multiple Mechanic Options</span>
                </div>
              </div>

              {/* User Satisfaction Message */}
              <div className="text-center py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Over 80% of our users have avoided major issues</p>
              </div>

              {/* Continue Button */}
              <div className="mt-8">
                <button
                  onClick={handleContinue}
                  disabled={isSaving}
                  className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
