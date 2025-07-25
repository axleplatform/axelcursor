"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function MechanicOnboardingStep2Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    businessStartYear: "",
    locationAddress: "",
    travelDistance: "",
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Generate year options from 1970 to current year
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1969 }, (_, i) => currentYear - i)

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await (supabase.auth as any).getUser()

        if (authError) throw authError

        if (!user) {
          // Not authenticated, redirect to signup
          router.push("/onboarding/mechanic/signup")
          return
        }

        setUser(user)

        // Check if user already has a mechanic profile
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          // PGRST116 is "no rows returned" which is expected for new users
          throw profileError
        }

        // If profile exists, pre-fill form data
        if (profile) {
          setFormData({
            businessStartYear: profile.business_start_year?.toString() || "",
            locationAddress: profile.address || "",
            travelDistance: profile.service_radius?.toString() || "",
          })
        }
      } catch (error: unknown) {
        console.error("Auth check error:", error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setError("Authentication error. Please try logging in again.")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.businessStartYear) {
      errors.businessStartYear = "Please select when you started your business"
    }

    if (!formData.locationAddress.trim()) {
      errors.locationAddress = "Please enter your location address"
    }

    if (!formData.travelDistance) {
      errors.travelDistance = "Please enter your travel distance"
    } else if (isNaN(Number(formData.travelDistance)) || Number(formData.travelDistance) <= 0) {
      errors.travelDistance = "Please enter a valid travel distance"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    if (!user) {
      setError("You must be logged in to continue")
      router.push("/onboarding/mechanic/signup")
      return
    }

    setIsSaving(true)

    try {
      // Get the profile ID first to ensure we have it
      const { data: profile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (profileError) {
        throw new Error("Could not find your profile. Please complete the previous step first.")
      }

      // Update mechanic profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from("mechanic_profiles")
        .update({
          business_start_year: Number.parseInt(formData.businessStartYear),
          address: formData.locationAddress,
          service_radius: Number.parseInt(formData.travelDistance),
          onboarding_step: "certifications", // Mark next step
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .select()

      if (updateError) throw updateError

      if (!updatedProfile || updatedProfile.length === 0) {
        throw new Error("Failed to update profile")
      }

      // Verify data was saved by fetching it back
      const { data: verifyProfile, error: verifyError } = await supabase
        .from("mechanic_profiles")
        .select("business_start_year, address, service_radius")
        .eq("id", profile.id)
        .single()

      if (verifyError) throw verifyError

      // Verify all fields were saved correctly
      if (
        verifyProfile.business_start_year !== Number.parseInt(formData.businessStartYear) ||
        verifyProfile.address !== formData.locationAddress ||
        verifyProfile.service_radius !== Number.parseInt(formData.travelDistance)
      ) {
        throw new Error("Data verification failed. Some information was not saved correctly.")
      }

      // Update user metadata
      await (supabase.auth as any).updateUser({
        data: {
          onboarding_step: "certifications",
        },
      })

      toast({
        title: "Information saved",
        description: "Your business information has been saved successfully.",
      })

      // Redirect to next step
      router.push("/onboarding-mechanic-3")
    } catch (error: unknown) {
      console.error("Error saving data:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError("Failed to save your information. Please try again. " + errorMessage)

      toast({
        title: "Error",
        description: "There was a problem saving your information.",
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
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-3">
            <button
              onClick={() => router.back()}
              className="mr-2 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Onboarding Header with Progress Tracker */}
          <OnboardingHeader currentStep={2} subtitle="Tell us about your business" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Form Fields */}
              <div className="px-4 py-3 space-y-4">
                {/* Business Start Year */}
                <div>
                  <label htmlFor="businessStartYear" className="block text-sm font-medium text-gray-700">
                    When did you start your mobile mechanic business? <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-lg sm:text-xl lg:text-2xl leading-none text-[#294a46] inline-flex items-center justify-center">🚗</span>
                    </div>
                    <select
                      id="businessStartYear"
                      name="businessStartYear"
                      value={formData.businessStartYear}
                      onChange={handleChange}
                      className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                        validationErrors.businessStartYear
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                    >
                      <option value="">Select year</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  {validationErrors.businessStartYear && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.businessStartYear}</p>
                  )}
                </div>

                {/* Location Address */}
                <div>
                  <label htmlFor="locationAddress" className="block text-sm font-medium text-gray-700">
                    Location address <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-lg sm:text-xl lg:text-2xl leading-none text-[#294a46] inline-flex items-center justify-center">📍</span>
                    </div>
                    <input
                      type="text"
                      id="locationAddress"
                      name="locationAddress"
                      value={formData.locationAddress}
                      onChange={handleChange}
                      placeholder="Enter your full address"
                      className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                        validationErrors.locationAddress ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                  </div>
                  {validationErrors.locationAddress && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.locationAddress}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    This will be used as your base location for service requests
                  </p>
                </div>

                {/* Travel Distance */}
                <div>
                  <label htmlFor="travelDistance" className="block text-sm font-medium text-gray-700">
                    Travel distance from location (miles) <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-lg sm:text-xl lg:text-2xl leading-none text-[#294a46] inline-flex items-center justify-center">🚗</span>
                    </div>
                    <input
                      type="number"
                      id="travelDistance"
                      name="travelDistance"
                      value={formData.travelDistance}
                      onChange={handleChange}
                      min="1"
                      placeholder="Enter distance in miles"
                      className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                        validationErrors.travelDistance ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                  </div>
                  {validationErrors.travelDistance && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.travelDistance}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    How far are you willing to travel from your location to provide service?
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="px-4 py-3 bg-gray-50">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
