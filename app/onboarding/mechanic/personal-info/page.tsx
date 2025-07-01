"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ChevronLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import { createClient } from "@/lib/supabase/client"

export default function MechanicPersonalInfoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  })

  // Check if user is authenticated and is a mechanic
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Not authenticated, redirect to signup
          router.push("/onboarding/mechanic/signup")
          return
        }

        // Check if user is a mechanic
        const { data: mechanic, error } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error || !mechanic) {
          // Not a mechanic or error, redirect to signup
          router.push("/onboarding/mechanic/signup")
          return
        }

        setUser(user)

        // Pre-fill form if data exists
        if (mechanic.first_name) {
          setFormData({
            firstName: mechanic.first_name || "",
            lastName: mechanic.last_name || "",
            phoneNumber: mechanic.phone_number || "",
            address: mechanic.address || "",
            city: mechanic.city || "",
            state: mechanic.state || "",
            zipCode: mechanic.zip_code || "",
          })
        }
      } catch (error: unknown) {
        console.error("Auth check error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-numeric characters
    const cleaned = e.target.value.replace(/\D/g, "")

    // Format the phone number
    let formatted = ""
    if (cleaned.length <= 3) {
      formatted = cleaned
    } else if (cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 3)})-${cleaned.slice(3)}`
    } else {
      formatted = `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }

    setFormData({ ...formData, phoneNumber: formatted })
  }

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      setError("Please fill in all required fields")
      return
    }

    setIsSaving(true)

    try {
      if (!user) throw new Error("User not authenticated")

      // Update mechanic profile
      const { error: updateError } = await supabase
        .from("mechanic_profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          onboarding_step: "professional_info",
        })
        .eq("user_id", user.id)

      if (updateError) throw updateError

      // Redirect to the next onboarding step
      router.push("/onboarding/mechanic/professional-info")
    } catch (error: unknown) {
      console.error("Error saving personal info:", error)
      const errorMessage = error instanceof Error ? error.message : "An error occurred while saving your information. Please try again."
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#294a46]" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />

      <main className="flex-1 py-6 px-4 bg-gray-50">
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
          <OnboardingHeader currentStep={1} subtitle="Tell us about yourself" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <div className="px-4 py-5">
              {error && (
                <div
                  className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
                  role="alert"
                >
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                      Phone number <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        name="phoneNumber"
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        required
                        placeholder="(123)-456-7890"
                        className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Street address
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="city"
                          id="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="state"
                          id="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                      ZIP / Postal code
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="zipCode"
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex justify-center py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
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
        </div>
      </main>

      <Footer />
    </div>
  )
}
