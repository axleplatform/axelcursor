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
import { saveMechanicProfile, getMechanicProfile, logProfileChange } from "@/lib/mechanic-profile"

export default function MechanicOnboardingStep1Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phoneNumber: "",
  })

  const { toast } = useToast()

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const { data: sessionData } = await (supabase.auth as any).getSession()
        const session = sessionData?.session
        if (!session?.user) {
          router.push('/login')
          return
        }
        
        setUser(session.user)

        // Check if user already has a mechanic profile
        const profile = await getMechanicProfile(session.user.id)

        if (profile) {
          setProfileId(profile.id)

          // Pre-fill form data from standard fields
          setFormData({
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            dateOfBirth: profile.date_of_birth || "",
            phoneNumber: profile.phone_number || "",
          })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
        console.error('Auth error:', errorMessage)
        router.push('/login')
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

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required"
    } else {
      // Check if user is at least 18 years old
      const dob = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()

      if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())))) {
        newErrors.dateOfBirth = "You must be at least 18 years old"
      }
    }

    if (!formData.phoneNumber || formData.phoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.phoneNumber = "Valid phone number is required"
    }

    setError(newErrors.dateOfBirth || newErrors.phoneNumber || newErrors.firstName || newErrors.lastName ? newErrors.dateOfBirth || newErrors.phoneNumber || newErrors.firstName || newErrors.lastName : null)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (!user) {
        throw new Error("You must be logged in to complete this step")
      }

      console.log("🔍 Starting profile creation/update for user:", user.id)

      // Get existing profile or create new one
      const { data: existingProfile, error: profileError } = await supabase
        .from("mechanic_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("❌ Error checking existing profile:", profileError)
        throw profileError
      }

      let profileId = existingProfile?.id

      if (!profileId) {
        console.log("📝 Creating new mechanic profile")
        const { data: newProfile, error: createError } = await supabase
          .from("mechanic_profiles")
          .insert([
            {
              user_id: user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              date_of_birth: formData.dateOfBirth,
              phone_number: formData.phoneNumber,
              onboarding_step: "professional_info",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select("id")
          .single()

        if (createError) {
          console.error("❌ Error creating profile:", createError)
          throw createError
        }

        if (!newProfile?.id) {
          console.error("❌ No ID returned after profile creation")
          throw new Error("Failed to create profile - no ID returned")
        }

        profileId = newProfile.id
        console.log("✅ New profile created with ID:", profileId)
      } else {
        console.log("📝 Updating existing profile:", profileId)
        const { error: updateError } = await supabase
          .from("mechanic_profiles")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            date_of_birth: formData.dateOfBirth,
            phone_number: formData.phoneNumber,
            onboarding_step: "professional_info",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId)

        if (updateError) {
          console.error("❌ Error updating profile:", updateError)
          throw updateError
        }
      }

      // Verify the profile was created/updated correctly
      const { data: verifyProfile, error: verifyError } = await supabase
        .from("mechanic_profiles")
        .select("id, user_id, first_name, last_name")
        .eq("id", profileId)
        .single()

      if (verifyError) {
        console.error("❌ Error verifying profile:", verifyError)
        throw verifyError
      }

      if (!verifyProfile) {
        console.error("❌ Profile verification failed - no profile found")
        throw new Error("Profile verification failed")
      }

      console.log("✅ Profile verified:", verifyProfile)

      // Update user metadata
      const { error: userError } = await (supabase.auth as any).updateUser({
        data: {
          onboarding_step: "professional_info",
        },
      })

      if (userError) {
        console.error("❌ Error updating user metadata:", userError)
        throw userError
      }

      // Show success message
      toast({
        title: "Step completed!",
        description: "Your personal information has been saved.",
      })

      // Redirect to next step
      router.push("/onboarding-mechanic-2")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save information'
      console.error('Error saving profile:', errorMessage)
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
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
            <p className="text-gray-600">Verifying your account...</p>
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
          <OnboardingHeader currentStep={1} subtitle="Tell us about yourself" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Form Fields */}
              <div className="px-4 py-3 space-y-3">
                {/* First Name */}
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

                {/* Last Name */}
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

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of birth <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="dateOfBirth"
                      id="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                      max={new Date().toISOString().split("T")[0]} // Prevent future dates
                      className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                    />
                  </div>
                </div>

                {/* Phone Number */}
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
                      placeholder="(123)-456-7890"
                      required
                      className="shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10"
                    />
                  </div>
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
