"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import CarMakeModelSelector from "@/components/car-make-model-selector"
import PreferenceTagInput from "@/components/preference-tag-input"
import SearchableMultiSelect from "@/components/searchable-multi-select"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

// List of car brands/makes
const CAR_BRANDS = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Rolls-Royce",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]

// List of common automotive services
const AUTOMOTIVE_SERVICES = [
  "Oil Change",
  "Brake Repair",
  "Transmission Repair",
  "Engine Repair",
  "Suspension Work",
  "Electrical System Repair",
  "Air Conditioning Service",
  "Exhaust System Repair",
  "Wheel Alignment",
  "Tire Rotation/Replacement",
  "Battery Replacement",
  "Cooling System Service",
  "Fuel System Repair",
  "Ignition System Repair",
  "Steering Repair",
  "Clutch Replacement",
  "Timing Belt Replacement",
  "Radiator Repair",
  "Alternator Replacement",
  "Starter Replacement",
  "Transmission Flush",
  "Engine Tune-up",
  "Catalytic Converter Replacement",
  "Muffler Replacement",
  "Shock/Strut Replacement",
  "CV Joint Replacement",
  "Axle Repair",
  "Differential Repair",
  "Power Window Repair",
  "Power Lock Repair",
  "Windshield Replacement",
  "Engine Swap",
  "Turbocharger/Supercharger Installation",
  "Performance Upgrades",
  "Diesel Engine Repair",
  "Hybrid/Electric Vehicle Service",
  "Body Work",
  "Paint Jobs",
  "Collision Repair",
]

export default function MechanicOnboardingStep4Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [specializedCars, setSpecializedCars] = useState<Array<{ make: string; model: string }>>([])
  const [leastFavoriteBrands, setLeastFavoriteBrands] = useState<string[]>([])
  const [unwantedCars, setUnwantedCars] = useState<string[]>([])
  const [unwantedServices, setUnwantedServices] = useState<string[]>([])

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
          setSpecializedCars(profile.specialized_cars || [])
          setLeastFavoriteBrands(profile.least_favorite_brands || [])
          setUnwantedCars(profile.unwanted_cars || [])
          setUnwantedServices(profile.unwanted_services || [])
        }
      } catch (error: any) {
        console.error("Auth check error:", error)
        setError("Authentication error. Please try logging in again.")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Handle adding a specialized car
  const handleAddSpecializedCar = (make: string, model: string) => {
    setSpecializedCars([...specializedCars, { make, model }])
  }

  // Handle removing a specialized car
  const handleRemoveSpecializedCar = (index: number) => {
    setSpecializedCars(specializedCars.filter((_, i) => i !== index))
  }

  // Handle adding an unwanted car
  const handleAddUnwantedCar = (car: string) => {
    setUnwantedCars([...unwantedCars, car])
  }

  // Handle removing an unwanted car
  const handleRemoveUnwantedCar = (index: number) => {
    setUnwantedCars(unwantedCars.filter((_, i) => i !== index))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
        throw new Error("Could not find your profile. Please complete the previous steps first.")
      }

      // Update mechanic profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from("mechanic_profiles")
        .update({
          specialized_cars: specializedCars,
          least_favorite_brands: leastFavoriteBrands,
          unwanted_cars: unwantedCars,
          unwanted_services: unwantedServices,
          onboarding_step: "profile_completion", // Mark next step
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
        .select("specialized_cars, least_favorite_brands, unwanted_cars, unwanted_services")
        .eq("id", profile.id)
        .single()

      if (verifyError) throw verifyError

      // Verify key fields were saved correctly
      if (
        JSON.stringify(verifyProfile.specialized_cars) !== JSON.stringify(specializedCars) ||
        JSON.stringify(verifyProfile.least_favorite_brands) !== JSON.stringify(leastFavoriteBrands) ||
        JSON.stringify(verifyProfile.unwanted_cars) !== JSON.stringify(unwantedCars) ||
        JSON.stringify(verifyProfile.unwanted_services) !== JSON.stringify(unwantedServices)
      ) {
        throw new Error("Data verification failed. Some information was not saved correctly.")
      }

      // Update user metadata
      await (supabase.auth as any).updateUser({
        data: {
          onboarding_step: "profile_completion",
        },
      })

      toast({
        title: "Information saved",
        description: "Your preferences have been saved successfully.",
      })

      // Redirect to next step - profile completion
      router.push("/onboarding-mechanic-5")
    } catch (error: any) {
      console.error("Error saving data:", error)
      setError("Failed to save your information. Please try again. " + (error.message || ""))

      toast({
        title: "Error",
        description: "There was a problem saving your preferences.",
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
          <OnboardingHeader currentStep={4} subtitle="Tell us about your preferences" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Specialized Cars Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Specialized cars to work on</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select the car makes and models you specialize in or prefer to work on.
                </p>

                <CarMakeModelSelector
                  selectedCars={specializedCars}
                  onAddCar={handleAddSpecializedCar}
                  onRemoveCar={handleRemoveSpecializedCar}
                />
              </div>

              {/* Least Favorite Brands Section - UPDATED */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Least favorite brands to work on</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select car brands that you prefer not to work on but will accept if necessary.
                </p>

                <SearchableMultiSelect
                  options={CAR_BRANDS}
                  selectedValues={leastFavoriteBrands}
                  onValueChange={setLeastFavoriteBrands}
                  placeholder="Select car brands..."
                  searchPlaceholder="Search car brands..."
                  addCustomLabel="Add custom brand"
                  tagColor="green"
                />
              </div>

              {/* Unwanted Cars Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cars that you do not wish to work on</h3>
                <p className="text-sm text-gray-500 mb-4">Add types of cars that you do not want to work on at all.</p>

                <PreferenceTagInput
                  tags={unwantedCars}
                  onAddTag={handleAddUnwantedCar}
                  onRemoveTag={handleRemoveUnwantedCar}
                  placeholder="E.g., Exotic cars, Electric vehicles"
                  tagColor="red"
                />
              </div>

              {/* Unwanted Services Section - UPDATED */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Services that you do not wish to work on</h3>
                <p className="text-sm text-gray-500 mb-4">Select services that you do not want to provide.</p>

                <SearchableMultiSelect
                  options={AUTOMOTIVE_SERVICES}
                  selectedValues={unwantedServices}
                  onValueChange={setUnwantedServices}
                  placeholder="Select services..."
                  searchPlaceholder="Search services..."
                  addCustomLabel="Add custom service"
                  tagColor="green"
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
                    "Complete Onboarding"
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
