"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Check,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

// Define types for form data
interface BookingFormData {
  issueDescription: string
  phoneNumber: string
  carRuns: boolean | null
  selectedServices: string[]
  selectedCarIssues: string[]
  location: string
  vin: string
  year: string
  make: string
  model: string
  mileage: string
  licensePlate: string
}

// Define database schema types
interface AppointmentData {
  id: string
  user_id: string
  location: string
  appointment_date: string
  status: string
  source: string
  is_guest: boolean
  created_at: string
  updated_at: string
  car_runs: boolean | null
  issue_description: string
  selected_services: string[]
  selected_car_issues: string[]
  phone_number: string
  vehicles: {
    vin: string
    year: string
    make: string
    model: string
    mileage: string
  } | null
}

// Default recommended services to show before user input
const defaultRecommendedServices = [
  {
    service: "General Inspection",
    description: "Comprehensive check of your vehicle.",
    confidence: 0.9,
  },
  {
    service: "Diagnostic Scan",
    description: "Computer scan for error codes.",
    confidence: 0.8,
  },
  {
    service: "Maintenance Check",
    description: "Review upcoming service requirements.",
    confidence: 0.7,
  }
]

// Define car issue options
const carIssueOptions = [
  {
    id: "warning_lights",
    label: "Warning Lights On",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">⚠️</span>,
    description: "Dashboard warning lights are illuminated",
  },
  {
    id: "battery_issues",
    label: "Battery Issues",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">🔋</span>,
    description: "Car won't start or battery dies quickly",
  },
  {
    id: "engine_performance",
    label: "Engine Performance",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">⏲️</span>,
    description: "Rough idle, stalling, or power loss",
  },
  {
    id: "overheating",
    label: "Overheating",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">🌡️</span>,
    description: "Engine temperature too high",
  },
  {
    id: "fluid_leaks",
    label: "Fluid Leaks",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">💧</span>,
    description: "Visible fluid leaking under vehicle",
  },
  {
    id: "mechanical_damage",
    label: "Mechanical Damage",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">🔧</span>,
    description: "Physical damage to components",
  },
  {
    id: "electrical_problems",
    label: "Electrical Problems",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">⚡</span>,
    description: "Issues with lights, electronics, or wiring",
  },
  {
    id: "needs_towing",
    label: "Needs Towing",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">🚛</span>,
    description: "Vehicle cannot be driven to service location",
  },
  {
    id: "unusual_noises",
    label: "Unusual Noises",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">🔊</span>,
    description: "Knocking, grinding, or squealing sounds",
  },
  {
    id: "vibration",
    label: "Vibration",
    icon: () => <span className="text-base sm:text-lg lg:text-xl leading-none mb-1 inline-flex items-center justify-center">📳</span>,
    description: "Shaking or vibration when driving",
  },
]

// Enhanced diagnostic system with more comprehensive categories and responses
const diagnosticSystem = {
  categories: [
    {
      name: "Engine",
      keywords: [
        "engine",
        "misfire",
        "knocking",
        "stalling",
        "rough idle",
        "check engine",
        "power loss",
        "acceleration",
        "hesitation",
        "rpm",
      ],
      responses: [
        {
          conditions: ["misfire", "knocking"],
          service: "Engine Diagnostic & Inspection",
          description: "Checks spark plugs, ignition coils, and timing.",
        },
        {
          conditions: ["stalling", "rough idle"],
          service: "Fuel System Diagnostic",
          description: "Examines fuel pump and injectors.",
        },
        {
          conditions: ["check engine"],
          service: "Check Engine Diagnostic",
          description: "Scans error codes for mechanical issues.",
        },
      ],
    },
    {
      name: "Transmission",
      keywords: [
        "transmission",
        "shifting",
        "slipping",
        "grinding",
        "hard shift",
        "delayed shift",
        "gear",
        "clutch",
        "automatic",
        "manual",
      ],
      responses: [
        {
          conditions: ["slipping", "hard shift"],
          service: "Transmission Inspection",
          description: "Checks fluid levels and internal components.",
        },
        {
          conditions: ["grinding", "clutch"],
          service: "Clutch System Check",
          description: "Manual transmission clutch assessment.",
        },
      ],
    },
    {
      name: "Brakes",
      keywords: [
        "brakes",
        "squealing",
        "grinding",
        "brake",
        "stopping",
        "pedal",
        "soft pedal",
        "hard pedal",
        "brake fluid",
        "brake light",
      ],
      responses: [
        {
          conditions: ["squealing", "grinding"],
          service: "Brake Pad & Rotor Inspection",
          description: "Checks brake pad thickness and rotor condition.",
        },
        {
          conditions: ["soft pedal", "brake fluid"],
          service: "Brake System Fluid Check",
          description: "Inspects brake fluid levels and lines.",
        },
      ],
    },
    {
      name: "Electrical",
      keywords: [
        "battery",
        "alternator",
        "lights",
        "electrical",
        "power",
        "charging",
        "starter",
        "fuses",
        "wiring",
        "dead battery",
      ],
      responses: [
        {
          conditions: ["battery", "dead battery"],
          service: "Battery & Charging System Test",
          description: "Tests battery health and charging system.",
        },
        {
          conditions: ["alternator", "charging"],
          service: "Alternator Diagnostic",
          description: "Checks alternator output and belt condition.",
        },
        {
          conditions: ["lights", "electrical"],
          service: "Electrical System Diagnostic",
          description: "Troubleshoots electrical issues and connections.",
        },
      ],
    },
    {
      name: "Cooling",
      keywords: [
        "overheating",
        "coolant",
        "radiator",
        "thermostat",
        "temperature",
        "cooling",
        "fan",
        "steam",
        "hot",
        "leak",
      ],
      responses: [
        {
          conditions: ["overheating", "temperature"],
          service: "Cooling System Inspection",
          description: "Checks coolant levels, radiator, and thermostat.",
        },
        {
          conditions: ["leak", "coolant"],
          service: "Coolant Leak Detection",
          description: "Identifies and repairs coolant leaks.",
        },
      ],
    },
  ],
}

// Function to get AI-powered service recommendations
function getAIDiagnostics(carIssue: string): Array<{ service: string; description: string; confidence: number }> | null {
  const lowerCaseIssue = carIssue.toLowerCase()
  const words = lowerCaseIssue.split(/\s+/)
  const matches: Array<{ service: string; description: string; confidence: number }> = []

  // Check each category for keyword matches
  diagnosticSystem.categories.forEach((category) => {
    category.keywords.forEach((keyword) => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, "i")
      if (keywordRegex.test(lowerCaseIssue)) {
        // Find relevant responses for this keyword
        category.responses.forEach((response) => {
          const conditionMatches = response.conditions.some((condition) =>
            lowerCaseIssue.includes(condition.toLowerCase()),
          )
          if (conditionMatches) {
            // Calculate confidence based on keyword relevance
            const confidence = Math.min(0.9, 0.6 + words.filter((word) => word.includes(keyword)).length * 0.1)
            matches.push({
              service: response.service,
              description: response.description,
              confidence,
            })
          }
        })
      }
    })
  })

  // Remove duplicates and sort by confidence
  const uniqueMatches = matches.filter(
    (match, index, self) => index === self.findIndex((m) => m.service === match.service),
  )
  uniqueMatches.sort((a, b) => b.confidence - a.confidence)

  return uniqueMatches.length > 0 ? uniqueMatches.slice(0, 3) : null
}

export default function BookAppointment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { toast } = useToast()
  const supabase = createClient()

  // Get data from URL params (from home page form)
  const address = searchParams.get("address") || ""
  const year = searchParams.get("year") || ""
  const make = searchParams.get("make") || ""
  const model = searchParams.get("model") || ""
  const appointmentId = searchParams.get("appointmentId")

  // State for form data
  const [formData, setFormData] = useState<BookingFormData>({
    issueDescription: "",
    phoneNumber: "",
    carRuns: null,
    selectedServices: [],
    selectedCarIssues: [],
    location: address,
    vin: "",
    year: year,
    make: make,
    model: model,
    mileage: "",
    licensePlate: "",
  })

  // State for dynamic recommendations
  const [recommendedServices, setRecommendedServices] = useState(defaultRecommendedServices)
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTextarea, setShowTextarea] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch existing appointment data if appointmentId is provided
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!appointmentId) return

      try {
        console.log("🔍 Fetching appointment data for ID:", appointmentId)
        const { data: appointments, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*)
          `)
          .eq("id", appointmentId)

        if (error) throw error

        if (appointments && appointments.length > 0) {
          const appointmentData = appointments[0]
          console.log("✅ Appointment data loaded:", appointmentData)

          setAppointment(appointmentData)
          setFormData({
            issueDescription: appointmentData.issue_description || "",
            phoneNumber: appointmentData.phone_number || "",
            carRuns: appointmentData.car_runs,
            selectedServices: appointmentData.selected_services || [],
            selectedCarIssues: appointmentData.selected_car_issues || [],
            location: appointmentData.location || address,
            vin: appointmentData.vehicles?.vin || "",
            year: appointmentData.vehicles?.year || year,
            make: appointmentData.vehicles?.make || make,
            model: appointmentData.vehicles?.model || model,
            mileage: appointmentData.vehicles?.mileage || "",
            licensePlate: "", // Not stored in current schema
          })

          // Set AI recommendations based on existing description
          if (appointmentData.issue_description) {
            const aiRecommendations = getAIDiagnostics(appointmentData.issue_description)
            if (aiRecommendations) {
              setRecommendedServices(aiRecommendations)
            }
          }
        }
      } catch (error) {
        console.error("❌ Error fetching appointment:", error)
        toast({
          title: "Error",
          description: "Failed to load appointment data",
          variant: "destructive",
        })
      }
    }

    fetchAppointmentData()
  }, [appointmentId])

  // Phone number formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    let formatted = value
    if (value.length >= 6) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`
    } else if (value.length >= 3) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`
    }
    setFormData({ ...formData, phoneNumber: formatted })
  }

  // Service selection
  const toggleService = (service: string) => {
    const isSelected = formData.selectedServices.includes(service)
    setFormData({
      ...formData,
      selectedServices: isSelected
        ? formData.selectedServices.filter((s) => s !== service)
        : [...formData.selectedServices, service],
    })
  }

  // Car issue selection
  const toggleCarIssue = (issueId: string) => {
    const isSelected = formData.selectedCarIssues.includes(issueId)
    setFormData({
      ...formData,
      selectedCarIssues: isSelected
        ? formData.selectedCarIssues.filter((issue) => issue !== issueId)
        : [...formData.selectedCarIssues, issueId],
    })
  }

  // Show textarea when user clicks to describe issue
  const handleTextAreaFocus = () => {
    setShowTextarea(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  // Update recommendations based on user input
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setFormData({ ...formData, issueDescription: value })
  }

  // Car runs selection
  const handleCarRunsChange = (value: boolean) => {
    setFormData({ ...formData, carRuns: value })
  }

  // Create a temporary user record immediately (no more NULL user_id!)
  const createTemporaryUser = async () => {
    try {
      // Call Supabase function to create a temporary user
      const { data: userId, error: userError } = await supabase.rpc("create_temporary_user")

      if (userError) {
        console.error("Error creating temporary user:", userError)

        // If RPC function doesn't exist yet (migration not run), provide helpful error
        if (userError.message?.includes("function") || userError.code === "42883") {
          throw new Error(
            "Database migration required: create_temporary_user function not found. Please run the migration first.",
          )
        }

        throw new Error(`Database error: ${userError.message}`)
      }

      if (!userId) {
        throw new Error("No user ID returned from create_temporary_user function")
      }

      console.log("✅ Temporary user created successfully:", userId)
      return userId as string
    } catch (error) {
      console.error("❌ Failed to create temporary user:", error)
      throw error instanceof Error ? error : new Error("Unknown error creating user")
    }
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("📤 Starting appointment submission...")

      // Validate required fields
      if (!formData.issueDescription?.trim()) {
        throw new Error("Please describe what's wrong with your car")
      }

      if (!formData.phoneNumber) {
        throw new Error("Please provide a phone number")
      }

      if (formData.carRuns === null) {
        throw new Error("Please indicate if your car is running")
      }

      // Get the current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      console.log("🔍 Current user:", user?.id || "No authenticated user")

      let finalUserId: string

      if (user?.id) {
        // Use authenticated user's ID
        finalUserId = user.id
        console.log("✅ Using authenticated user ID:", finalUserId)
      } else {
        // Create temporary user for guest bookings
        console.log("🔄 Creating temporary user for guest booking...")
        finalUserId = await createTemporaryUser()
      }

      const appointmentData = {
        user_id: finalUserId,
        location: formData.location,
        appointment_date: new Date().toISOString(),
        status: "pending",
        source: "web_form",
        car_runs: formData.carRuns,
        issue_description: formData.issueDescription,
        selected_services: formData.selectedServices,
        selected_car_issues: formData.selectedCarIssues,
        phone_number: formData.phoneNumber,
      }

      let finalAppointmentId: string

      if (appointmentId && appointment) {
        // Update existing appointment
        console.log("🔄 Updating existing appointment:", appointmentId)
        const { error: updateError } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointmentId)

        if (updateError) throw updateError

        finalAppointmentId = appointmentId
        console.log("✅ Appointment updated successfully")
      } else {
        // Create new appointment
        console.log("🔄 Creating new appointment...")
        const { data: newAppointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert([appointmentData])
          .select("id")
          .single()

        if (appointmentError) throw appointmentError

        if (!newAppointment?.id) {
          throw new Error("No appointment ID returned from database")
        }

        finalAppointmentId = newAppointment.id
        console.log("✅ Appointment created successfully:", finalAppointmentId)
      }

      // Create or update vehicle information
      const vehicleData = {
        appointment_id: finalAppointmentId,
        vin: formData.vin || null,
        year: formData.year ? parseInt(formData.year) : null,
        make: formData.make || null,
        model: formData.model || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
      }

      // Check if vehicle already exists for this appointment
      const { data: existingVehicle, error: vehicleCheckError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("appointment_id", finalAppointmentId)
        .maybeSingle()

      if (vehicleCheckError) {
        console.warn("Error checking existing vehicle:", vehicleCheckError)
      }

      if (existingVehicle) {
        // Update existing vehicle
        const { error: vehicleUpdateError } = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("appointment_id", finalAppointmentId)

        if (vehicleUpdateError) {
          console.error("Error updating vehicle:", vehicleUpdateError)
        } else {
          console.log("✅ Vehicle updated successfully")
        }
      } else {
        // Create new vehicle record
        const { error: vehicleError } = await supabase.from("vehicles").insert([vehicleData])

        if (vehicleError) {
          console.error("Error creating vehicle:", vehicleError)
        } else {
          console.log("✅ Vehicle created successfully")
        }
      }

      // Show success and navigate
      toast({
        title: "Appointment Request Submitted!",
        description: "Mechanics in your area will review and provide quotes.",
      })

      // Navigate to mechanic selection page
      router.push(`/pick-mechanic?appointmentId=${finalAppointmentId}`)
    } catch (error) {
      console.error("❌ Error submitting appointment:", error)

      let errorMessage = "Failed to submit appointment"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <div className="flex-1 bg-gray-50">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
            <p className="text-gray-600">
              Provide details about your car issue so mechanics can give you accurate quotes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Location Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Location</label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-gray-900">{formData.location || "Location not specified"}</p>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Information</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
            </div>

            {/* Additional Vehicle Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mileage (optional)</label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VIN (optional)</label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  maxLength={17}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                maxLength={14}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
              />
            </div>

            {/* Car Running Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Is your car currently running? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleCarRunsChange(true)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.carRuns === true
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">✅ Yes, it runs</div>
                      <div className="text-sm text-gray-600">Car starts and drives</div>
                    </div>
                    {formData.carRuns === true && <Check className="h-5 w-5 text-green-600" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleCarRunsChange(false)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.carRuns === false
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">❌ No, it doesn't run</div>
                      <div className="text-sm text-gray-600">Car won't start or drive</div>
                    </div>
                    {formData.carRuns === false && <Check className="h-5 w-5 text-red-600" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Car Issues Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What issues are you experiencing? (Select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {carIssueOptions.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => toggleCarIssue(issue.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.selectedCarIssues.includes(issue.id)
                        ? "border-[#294a46] bg-[#294a46]/5 text-[#294a46]"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">{issue.icon()}</div>
                      <div className="flex-1">
                        <div className="font-medium">{issue.label}</div>
                        <div className="text-sm text-gray-600">{issue.description}</div>
                      </div>
                      {formData.selectedCarIssues.includes(issue.id) && (
                        <Check className="h-5 w-5 text-[#294a46] flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe the issue in detail <span className="text-red-500">*</span>
              </label>
              {!showTextarea ? (
                <button
                  type="button"
                  onClick={handleTextAreaFocus}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-left text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  Click here to describe what's wrong with your car...
                </button>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={formData.issueDescription}
                  onChange={handleDescriptionChange}
                  placeholder="Describe the symptoms, when they occur, any sounds you hear, etc. The more detail you provide, the better mechanics can help you."
                  rows={4}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                />
              )}
            </div>

            {/* AI-Recommended Services */}
            {recommendedServices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Recommended Services (Optional)
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    Based on your description
                  </span>
                </label>
                <div className="space-y-3">
                  {recommendedServices.map((rec, index) => (
                    <button
                      key={`${rec.service}-${index}`}
                      type="button"
                      onClick={() => toggleService(rec.service)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        formData.selectedServices.includes(rec.service)
                          ? "border-[#294a46] bg-[#294a46]/5 text-[#294a46]"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{rec.service}</div>
                          <div className="text-sm text-gray-600">{rec.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {Math.round((rec.confidence || 0) * 100)}%
                          </div>
                        </div>
                        {formData.selectedServices.includes(rec.service) && (
                          <Check className="h-5 w-5 text-[#294a46]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#294a46] text-white py-4 px-6 rounded-lg font-medium hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit Appointment Request"}
              </button>
            </div>

            {/* Footer note */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                After submitting, mechanics in your area will review your request and provide quotes.
              </p>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}