"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import ProfileImageUpload from "@/components/profile-image-upload"
import VehicleInfoForm from "@/components/vehicle-info-form"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface VehicleInfo {
  year: number
  make: string
  model: string
  licensePlate: string
}

export default function MechanicOnboardingStep5Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const { toast } = useToast()

  // Form state
  const [bio, setBio] = useState("")
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    bio?: string
    vehicleYear?: string
    vehicleMake?: string
    vehicleModel?: string
    licensePlate?: string
  }>({})

  // Check if user is authenticated and load existing data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)

        // Get authenticated user
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

        // Ensure the mechanic_profiles table exists
        try {
          await supabase.rpc("run_sql", {
            sql: `
              CREATE TABLE IF NOT EXISTS mechanic_profiles (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(255),
                avatar_url TEXT,
                bio TEXT,
                specialties TEXT[],
                experience VARCHAR(255),
                rating DECIMAL(3, 2),
                review_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              
              -- Add indexes for performance
              CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_user_id ON mechanic_profiles(user_id);
            `,
          })
        } catch (err) {
          console.warn("Could not ensure mechanic_profiles table exists:", err)
          // Continue anyway, we'll handle this later
        }

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
          setProfileId(profile.id)
          setBio(profile.bio || "")
          setProfileImageUrl(profile.profile_image_url || null)

          if (profile.vehicle_year && profile.vehicle_make && profile.vehicle_model && profile.license_plate) {
            setVehicleInfo({
              year: profile.vehicle_year,
              make: profile.vehicle_make,
              model: profile.vehicle_model,
              licensePlate: profile.license_plate,
            })
          }
        } else {
          // No profile found, check previous steps
          throw new Error("Could not find your profile. Please complete the previous steps first.")
        }

        // Also check user metadata for any additional data
        if (user.user_metadata) {
          if (!bio && user.user_metadata.bio) {
            setBio(user.user_metadata.bio)
          }

          if (!profileImageUrl && user.user_metadata.profile_image_url) {
            setProfileImageUrl(user.user_metadata.profile_image_url)
          }

          if (!vehicleInfo && user.user_metadata.vehicle_info) {
            setVehicleInfo(user.user_metadata.vehicle_info)
          }
        }
      } catch (error: any) {
        console.error("Auth check error:", error)
        setError("Authentication error: " + (error.message || "Please try logging in again."))

        // If it's a specific error about missing profile, redirect to step 1
        if (error.message?.includes("Could not find your profile")) {
          toast({
            title: "Profile not found",
            description: "Please complete the previous onboarding steps first.",
            variant: "destructive",
          })
          router.push("/onboarding-mechanic-1")
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  // Handle vehicle info change - memoized to prevent infinite loops
  const handleVehicleInfoChange = useCallback((info: VehicleInfo) => {
    setVehicleInfo(info)
    // Clear validation errors
    setValidationErrors((prev) => ({
      ...prev,
      vehicleYear: undefined,
      vehicleMake: undefined,
      vehicleModel: undefined,
      licensePlate: undefined,
    }))
  }, [])

  // Validate form data
  const validateForm = () => {
    const errors: {
      bio?: string
      vehicleYear?: string
      vehicleMake?: string
      vehicleModel?: string
      licensePlate?: string
    } = {}

    // Validate bio
    if (!bio.trim()) {
      errors.bio = "Please enter a bio"
    } else if (bio.length < 10) {
      errors.bio = "Bio should be at least 10 characters"
    }

    // Validate vehicle info
    if (!vehicleInfo) {
      errors.vehicleYear = "Please select a year"
      errors.vehicleMake = "Please select a make"
      errors.vehicleModel = "Please select a model"
      errors.licensePlate = "Please enter a license plate"
    } else {
      if (!vehicleInfo.year) {
        errors.vehicleYear = "Please select a year"
      }
      if (!vehicleInfo.make) {
        errors.vehicleMake = "Please select a make"
      }
      if (!vehicleInfo.model) {
        errors.vehicleModel = "Please select a model"
      }
      if (!vehicleInfo.licensePlate.trim()) {
        errors.licensePlate = "Please enter a license plate"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (!user) {
        throw new Error("You must be logged in to complete this step")
      }

      if (!profileId) {
        throw new Error("Profile ID is missing. Please start over from step 1.")
      }

      // Update the mechanic profile
      const { error: profileError } = await supabase
        .from("mechanic_profiles")
        .update({
          bio,
          profile_image_url: profileImageUrl,
          vehicle_year: vehicleInfo?.year,
          vehicle_make: vehicleInfo?.make,
          vehicle_model: vehicleInfo?.model,
          license_plate: vehicleInfo?.licensePlate,
          onboarding_completed: true,
          onboarding_step: "completed",
        })
        .eq("id", profileId)

      if (profileError) throw profileError

      // Create or update the mechanic record
      const { error: mechanicError } = await supabase
        .from("mechanic_profiles")
        .upsert({
          user_id: user.id,
          profile_id: profileId,
          bio,
          profile_image_url: profileImageUrl,
          vehicle_info: vehicleInfo,
        })

      if (mechanicError) throw mechanicError

      // Update user metadata
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          onboarding_step: "completed",
          bio,
          profile_image_url: profileImageUrl,
          vehicle_info: vehicleInfo,
        },
      })

      if (userError) throw userError

      // Show success message
      toast({
        title: "Onboarding complete!",
        description: "Your profile has been created successfully. Welcome to Axle!",
      })

      // Redirect to dashboard
      router.push("/mechanic/dashboard")
    } catch (error: any) {
      console.error("Error saving profile:", error)
      setError(error.message || "Failed to save profile. Please try again.")
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
          <OnboardingHeader currentStep={5} subtitle="Complete your profile" totalSteps={5} />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
              {/* Bio Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Bio</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tell potential customers about yourself and your experience.
                </p>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46] ${
                      validationErrors.bio ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                    }`}
                  />
                  {validationErrors.bio && <p className="mt-1 text-sm text-red-600">{validationErrors.bio}</p>}
                  <p className="mt-1 text-xs text-gray-500">Minimum 10 characters</p>
                </div>
              </div>

              {/* Vehicle Information Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Vehicle</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please provide information about the vehicle you use for your mobile mechanic service.
                </p>

                <VehicleInfoForm
                  initialData={
                    vehicleInfo
                      ? {
                          year: vehicleInfo.year,
                          make: vehicleInfo.make,
                          model: vehicleInfo.model,
                          licensePlate: vehicleInfo.licensePlate,
                        }
                      : undefined
                  }
                  onChange={handleVehicleInfoChange}
                  errors={{
                    year: validationErrors.vehicleYear,
                    make: validationErrors.vehicleMake,
                    model: validationErrors.vehicleModel,
                    licensePlate: validationErrors.licensePlate,
                  }}
                />
              </div>

              {/* Submit Button */}
              <div className="px-6 py-4 bg-gray-50">
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
                    "Finish"
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
