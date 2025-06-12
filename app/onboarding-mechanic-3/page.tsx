"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, LinkIcon } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import OnboardingHeader from "@/components/onboarding-header"
import TagInput from "@/components/tag-input"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/components/ui/use-toast"

const supabase = createClient()

// Common certificate suggestions
const CERTIFICATE_SUGGESTIONS = [
  "ASE Master Technician",
  "ASE A1 - Engine Repair",
  "ASE A2 - Automatic Transmission",
  "ASE A3 - Manual Drivetrain and Axles",
  "ASE A4 - Suspension and Steering",
  "ASE A5 - Brakes",
  "ASE A6 - Electrical/Electronic Systems",
  "ASE A7 - Heating and Air Conditioning",
  "ASE A8 - Engine Performance",
  "ASE A9 - Light Vehicle Diesel Engines",
  "ASE L1 - Advanced Engine Performance",
  "ASE L2 - Electronic Diesel Engine Diagnosis",
  "EPA 609 Certification",
  "Mobile Air Conditioning Society (MACS)",
  "State Emissions License",
  "BAR Certification",
]

// Business structure options with descriptions
const BUSINESS_STRUCTURES = [
  {
    value: "sole_proprietorship",
    label: "Sole Proprietorship",
    description:
      "A business owned and operated by one person with no legal distinction between the owner and the business.",
  },
  {
    value: "llc",
    label: "LLC",
    description: "Limited Liability Company - Combines elements of partnership and corporation structures.",
  },
  {
    value: "s_corp",
    label: "S-Corp",
    description: "S Corporation - Passes corporate income, losses, deductions, and credits through to shareholders.",
  },
  {
    value: "c_corp",
    label: "C-Corp",
    description: "C Corporation - Legally separate from its owners, with its own tax obligations.",
  },
  {
    value: "partnership",
    label: "Partnership",
    description: "A business relationship between two or more people who conduct business together.",
  },
  {
    value: "other",
    label: "Other",
    description: "Other business structure not listed above.",
  },
]

// Service specialties options
const SERVICE_SPECIALTIES = [
  { id: "oil_change", label: "Oil Change" },
  { id: "brake_repair", label: "Brake Repair" },
  { id: "engine_repair", label: "Engine Repair" },
  { id: "transmission", label: "Transmission" },
  { id: "electrical", label: "Electrical" },
  { id: "suspension", label: "Suspension" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "tire_service", label: "Tire Service" },
]

// Business description options
const BUSINESS_DESCRIPTIONS = [
  { id: "side_hustle", label: "Side hustle/Part-time work" },
  { id: "full_time", label: "Full-time independent mechanic" },
  { id: "becoming_incorporated", label: "Working on becoming incorporated" },
  { id: "just_starting", label: "Just starting out" },
  { id: "other", label: "Other" },
]

// Business description suggestions
const BUSINESS_DESCRIPTION_SUGGESTIONS = [
  "Mobile mechanic",
  "Freelance technician",
  "Specialty repair service",
  "Diagnostic specialist",
  "Classic car restoration",
  "Fleet maintenance provider",
  "Automotive educator/trainer",
  "Apprentice mechanic",
]

export default function MechanicOnboardingStep3Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    hasCertificates: null as boolean | null,
    certificates: [] as string[],
    isIncorporated: null as boolean | null,
    businessStructure: "",
    businessName: "",
    taxId: "",
    businessDescription: "",
    otherBusinessDescription: [] as string[],
    yelpUrl: "",
    googleUrl: "",
    websiteUrl: "",
    specialties: [] as string[],
    otherSpecialties: [] as string[],
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Check if user is authenticated and load existing data
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
          toast({
            title: "Authentication required",
            description: "Please sign up or log in to continue",
            variant: "destructive",
          })
          router.push("/onboarding/mechanic/signup")
          return
        }

        setUser(user)

        // Check if previous onboarding steps are completed
        const onboardingStep = user.user_metadata?.onboarding_step || "personal_info"
        if (onboardingStep === "personal_info") {
          toast({
            title: "Complete previous steps",
            description: "Please complete your personal information first",
          })
          router.push("/onboarding-mechanic-1")
          return
        }

        // Check if user already has a mechanic profile
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (profileError) {
          if (profileError.code === "PGRST116") {
            // No profile found, redirect to first step
            toast({
              title: "Profile not found",
              description: "Please start the onboarding process from the beginning",
              variant: "destructive",
            })
            router.push("/onboarding-mechanic-1")
            return
          }
          throw profileError
        }

        setMechanicProfile(profile)

        // If profile exists, pre-fill form data
        if (profile) {
          // Try to extract data from various possible locations
          const certificates = profile.certifications || []
          const isIncorporated = profile.is_incorporated !== undefined ? profile.is_incorporated : null
          const businessStructure = profile.business_structure || ""
          const businessName = profile.business_name || ""
          const taxId = profile.tax_id || ""
          const businessDescription = profile.business_description || ""
          const yelpUrl = profile.yelp_url || ""
          const googleUrl = profile.google_url || ""
          const websiteUrl = profile.website_url || ""
          const specialties = profile.specialties || []
          const otherSpecialties = profile.other_specialties || []

          // Convert string to array if needed for otherBusinessDescription
          let otherBusinessDescArray: string[] = []
          if (profile.other_business_description) {
            if (typeof profile.other_business_description === "string") {
              otherBusinessDescArray = [profile.other_business_description]
            } else if (Array.isArray(profile.other_business_description)) {
              otherBusinessDescArray = profile.other_business_description
            }
          }

          setFormData({
            hasCertificates: certificates && certificates.length > 0 ? true : false,
            certificates: certificates,
            isIncorporated: isIncorporated,
            businessStructure: businessStructure,
            businessName: businessName,
            taxId: taxId,
            businessDescription: businessDescription,
            otherBusinessDescription: otherBusinessDescArray,
            yelpUrl: yelpUrl,
            googleUrl: googleUrl,
            websiteUrl: websiteUrl,
            specialties: specialties,
            otherSpecialties: otherSpecialties,
          })
        }
      } catch (error: any) {
        console.error("Auth check error:", error)
        setError("Authentication error. Please try logging in again.")
        toast({
          title: "Authentication error",
          description: error.message || "Please try logging in again",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    if (type === "radio") {
      const boolValue = value === "true"

      // If changing incorporation status, reset related fields
      if (name === "isIncorporated") {
        if (boolValue) {
          // Reset non-incorporated fields
          setFormData({
            ...formData,
            isIncorporated: boolValue,
            businessDescription: "",
            otherBusinessDescription: [],
          })
        } else {
          // Reset incorporated fields
          setFormData({
            ...formData,
            isIncorporated: boolValue,
            businessStructure: "",
            businessName: "",
            taxId: "",
          })
        }
      } else if (name === "businessDescription") {
        // For business description radio buttons
        setFormData({
          ...formData,
          [name]: value,
          // Reset other description if not selecting "other"
          otherBusinessDescription: value === "other" ? formData.otherBusinessDescription : [],
        })
      } else {
        // For other radio buttons (like hasCertificates)
        setFormData({ ...formData, [name]: boolValue })
      }
    } else {
      setFormData({ ...formData, [name]: value })
    }

    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  // Handle specialty checkbox changes
  const handleSpecialtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target

    if (checked) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, value],
      })
    } else {
      setFormData({
        ...formData,
        specialties: formData.specialties.filter((specialty) => specialty !== value),
      })
    }
  }

  // Handle certificates change
  const handleCertificatesChange = (certificates: string[]) => {
    setFormData({ ...formData, certificates })
  }

  // Handle other business description change
  const handleOtherBusinessDescriptionChange = (otherBusinessDescription: string[]) => {
    setFormData({ ...formData, otherBusinessDescription })
  }

  // Handle other specialties change
  const handleOtherSpecialtiesChange = (otherSpecialties: string[]) => {
    setFormData({ ...formData, otherSpecialties })
  }

  // Validate EIN/Tax ID format (XX-XXXXXXX)
  const isValidTaxId = (taxId: string) => {
    const taxIdRegex = /^\d{2}-\d{7}$/
    return taxIdRegex.test(taxId)
  }

  // Validate URL format
  const isValidUrl = (url: string) => {
    if (!url) return true // Empty URLs are allowed
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validate certificates section
    if (formData.hasCertificates === null) {
      errors.hasCertificates = "Please indicate if you have certificates"
    } else if (formData.hasCertificates && formData.certificates.length === 0) {
      errors.certificates = "Please add at least one certificate"
    }

    // Validate business information section
    if (formData.isIncorporated === null) {
      errors.isIncorporated = "Please indicate if you are incorporated"
    } else if (formData.isIncorporated) {
      if (!formData.businessStructure) {
        errors.businessStructure = "Please select a business structure"
      }
      if (!formData.businessName.trim()) {
        errors.businessName = "Please enter your business name"
      }
      if (!formData.taxId) {
        errors.taxId = "Please enter your EIN/Tax ID"
      } else if (!isValidTaxId(formData.taxId)) {
        errors.taxId = "Please enter a valid EIN/Tax ID in the format XX-XXXXXXX"
      }
    } else if (formData.isIncorporated === false) {
      if (!formData.businessDescription) {
        errors.businessDescription = "Please select a business description"
      }
      if (formData.businessDescription === "other" && formData.otherBusinessDescription.length === 0) {
        errors.otherBusinessDescription = "Please describe your business"
      }
    }

    // Validate URLs
    if (formData.yelpUrl && !isValidUrl(formData.yelpUrl)) {
      errors.yelpUrl = "Please enter a valid URL"
    }
    if (formData.googleUrl && !isValidUrl(formData.googleUrl)) {
      errors.googleUrl = "Please enter a valid URL"
    }
    if (formData.websiteUrl && !isValidUrl(formData.websiteUrl)) {
      errors.websiteUrl = "Please enter a valid URL"
    }

    // Validate specialties
    if (formData.specialties.length === 0 && formData.otherSpecialties.length === 0) {
      errors.specialties = "Please select at least one specialty"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Format tax ID as user types (XX-XXXXXXX)
  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")

    let formattedValue = ""
    if (value.length <= 2) {
      formattedValue = value
    } else {
      formattedValue = `${value.slice(0, 2)}-${value.slice(2, 9)}`
    }

    setFormData({ ...formData, taxId: formattedValue })

    // Clear validation error
    if (validationErrors.taxId) {
      setValidationErrors((prev) => {
        const updated = { ...prev }
        delete updated.taxId
        return updated
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Please check your information",
        description: "Some required fields are missing or invalid",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      setError("You must be logged in to continue")
      toast({
        title: "Authentication required",
        description: "Please log in to continue",
        variant: "destructive",
      })
      router.push("/onboarding/mechanic/signup")
      return
    }

    if (!mechanicProfile || !mechanicProfile.id) {
      setError("Your profile information is missing. Please complete the previous steps first.")
      toast({
        title: "Profile not found",
        description: "Please complete the previous steps first",
        variant: "destructive",
      })
      router.push("/onboarding-mechanic-1")
      return
    }

    setIsSaving(true)

    try {
      // Store all form data in user metadata instead of mechanic_profiles table
      // This avoids any schema issues with the mechanic_profiles table
      const formDataToSave = {
        // Certificates
        certifications: formData.hasCertificates ? formData.certificates : [],
        // Business information
        is_incorporated: formData.isIncorporated,
        business_structure: formData.isIncorporated ? formData.businessStructure : null,
        business_name: formData.isIncorporated ? formData.businessName : null,
        tax_id: formData.isIncorporated ? formData.taxId : null,
        business_description: !formData.isIncorporated ? formData.businessDescription : null,
        other_business_description:
          !formData.isIncorporated && formData.businessDescription === "other"
            ? formData.otherBusinessDescription
            : null,
        // URLs
        yelp_url: formData.yelpUrl,
        google_url: formData.googleUrl,
        website_url: formData.websiteUrl,
        // Specialties
        specialties: formData.specialties,
        other_specialties: formData.otherSpecialties,
        // Onboarding step
        onboarding_step: "rates",
        // Profile ID for reference
        profile_id: mechanicProfile.id,
      }

      // Update user metadata with all form data
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...formDataToSave,
          // Add a timestamp for tracking
          step3_completed_at: new Date().toISOString(),
        },
      })

      if (updateError) throw updateError

      toast({
        title: "Information saved",
        description: "Your professional information has been saved successfully",
      })

      // Redirect to next step
      router.push("/onboarding-mechanic-4")
    } catch (error: any) {
      console.error("Error saving data:", error)
      setError(`Failed to save your information: ${error.message || "Unknown error"}`)
      toast({
        title: "Error saving data",
        description: error.message || "Please try again",
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
          <OnboardingHeader currentStep={3} subtitle="Tell us about your professional background" />

          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Certificates and Licenses Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Certificates and Licenses</h3>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Do you have any certificates or mechanic licenses?
                    {validationErrors.hasCertificates && (
                      <span className="text-red-500 ml-2 text-xs">{validationErrors.hasCertificates}</span>
                    )}
                  </p>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasCertificates"
                        value="true"
                        checked={formData.hasCertificates === true}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasCertificates"
                        value="false"
                        checked={formData.hasCertificates === false}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                {formData.hasCertificates && (
                  <div className="mt-4 animate-fadeIn">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Add your certificates/licenses
                      {validationErrors.certificates && (
                        <span className="text-red-500 ml-2 text-xs">{validationErrors.certificates}</span>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Type certificate names and press Enter, Tab, or comma to add. You can also select from common
                      certificates below.
                    </p>
                    <TagInput
                      tags={formData.certificates}
                      onChange={handleCertificatesChange}
                      suggestions={CERTIFICATE_SUGGESTIONS}
                      placeholder="Type a certificate name..."
                      maxTags={15}
                    />
                  </div>
                )}
              </div>

              {/* Business Information Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Are you incorporated?
                    {validationErrors.isIncorporated && (
                      <span className="text-red-500 ml-2 text-xs">{validationErrors.isIncorporated}</span>
                    )}
                  </p>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isIncorporated"
                        value="true"
                        checked={formData.isIncorporated === true}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isIncorporated"
                        value="false"
                        checked={formData.isIncorporated === false}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                {formData.isIncorporated && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label htmlFor="businessStructure" className="block text-sm font-medium text-gray-700 mb-1">
                        Business Structure
                        {validationErrors.businessStructure && (
                          <span className="text-red-500 ml-2 text-xs">{validationErrors.businessStructure}</span>
                        )}
                      </label>
                      <div className="relative">
                        <select
                          id="businessStructure"
                          name="businessStructure"
                          value={formData.businessStructure}
                          onChange={handleChange}
                          className={`shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                            validationErrors.businessStructure
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : ""
                          }`}
                        >
                          <option value="">Select business structure</option>
                          {BUSINESS_STRUCTURES.map((structure) => (
                            <option key={structure.value} value={structure.value}>
                              {structure.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.businessStructure && (
                        <p className="mt-1 text-xs text-gray-500">
                          {BUSINESS_STRUCTURES.find((s) => s.value === formData.businessStructure)?.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                        {validationErrors.businessName && (
                          <span className="text-red-500 ml-2 text-xs">{validationErrors.businessName}</span>
                        )}
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                          validationErrors.businessName ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                        EIN/Tax ID
                        {validationErrors.taxId && (
                          <span className="text-red-500 ml-2 text-xs">{validationErrors.taxId}</span>
                        )}
                      </label>
                      <input
                        type="text"
                        id="taxId"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleTaxIdChange}
                        placeholder="XX-XXXXXXX"
                        maxLength={10}
                        className={`shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                          validationErrors.taxId ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                      <p className="mt-1 text-xs text-gray-500">Format: XX-XXXXXXX</p>
                    </div>
                  </div>
                )}

                {formData.isIncorporated === false && (
                  <div className="mt-4 animate-fadeIn">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Which best describes your business?
                      {validationErrors.businessDescription && (
                        <span className="text-red-500 ml-2 text-xs">{validationErrors.businessDescription}</span>
                      )}
                    </p>
                    <div className="space-y-2 relative z-10">
                      {BUSINESS_DESCRIPTIONS.map((description) => (
                        <label key={description.id} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="businessDescription"
                            value={description.id}
                            checked={formData.businessDescription === description.id}
                            onChange={handleChange}
                            className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">{description.label}</span>
                        </label>
                      ))}
                    </div>

                    {formData.businessDescription === "other" && (
                      <div className="mt-3 ml-6 animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Please describe your business
                          {validationErrors.otherBusinessDescription && (
                            <span className="text-red-500 ml-2 text-xs">
                              {validationErrors.otherBusinessDescription}
                            </span>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Type your business description and press Enter, Tab, or comma to add. You can add multiple
                          descriptions.
                        </p>
                        <TagInput
                          tags={formData.otherBusinessDescription}
                          onChange={handleOtherBusinessDescriptionChange}
                          suggestions={BUSINESS_DESCRIPTION_SUGGESTIONS}
                          placeholder="Type your business description..."
                          maxTags={5}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Online Presence Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Online Presence</h3>
                <p className="text-sm text-gray-500 mb-4">
                  We'll use these links to verify your ratings and reviews on these platforms.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="yelpUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Yelp Business Page URL
                      {validationErrors.yelpUrl && (
                        <span className="text-red-500 ml-2 text-xs">{validationErrors.yelpUrl}</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        id="yelpUrl"
                        name="yelpUrl"
                        value={formData.yelpUrl}
                        onChange={handleChange}
                        placeholder="https://www.yelp.com/biz/your-business"
                        className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                          validationErrors.yelpUrl ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="googleUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Google Business Profile URL
                      {validationErrors.googleUrl && (
                        <span className="text-red-500 ml-2 text-xs">{validationErrors.googleUrl}</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        id="googleUrl"
                        name="googleUrl"
                        value={formData.googleUrl}
                        onChange={handleChange}
                        placeholder="https://g.page/your-business"
                        className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                          validationErrors.googleUrl ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Personal/Business Website URL
                      {validationErrors.websiteUrl && (
                        <span className="text-red-500 ml-2 text-xs">{validationErrors.websiteUrl}</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        id="websiteUrl"
                        name="websiteUrl"
                        value={formData.websiteUrl}
                        onChange={handleChange}
                        placeholder="https://www.yourbusiness.com"
                        className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
                          validationErrors.websiteUrl ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Specialties Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Service Specialties
                  {validationErrors.specialties && (
                    <span className="text-red-500 ml-2 text-xs">{validationErrors.specialties}</span>
                  )}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {SERVICE_SPECIALTIES.map((specialty) => (
                    <label key={specialty.id} className="flex items-center">
                      <input
                        type="checkbox"
                        name="specialties"
                        value={specialty.id}
                        checked={formData.specialties.includes(specialty.id)}
                        onChange={handleSpecialtyChange}
                        className="h-4 w-4 text-[#294a46] focus:ring-[#294a46] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{specialty.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Specialties</label>
                  <p className="text-xs text-gray-500 mb-2">Add any other specialties not listed above</p>
                  <TagInput
                    tags={formData.otherSpecialties}
                    onChange={handleOtherSpecialtiesChange}
                    placeholder="Type a specialty and press Enter..."
                    maxTags={10}
                  />
                </div>
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
                    "Continue"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />

      {/* Add some custom styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
