"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Lightbulb,
  Check,
  Phone,
  AlertTriangle,
  Battery,
  Gauge,
  Thermometer,
  Droplet,
  Wrench,
  Zap,
  Truck,
  Volume2,
  Vibrate,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/components/ui/use-toast"

// Define types for form data
interface BookingFormData {
  issueDescription: string
  phoneNumber: string
  carRuns: boolean | null
  selectedServices: string[]
  selectedCarIssues: string[]
}

// Define database schema types
interface AppointmentData {
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
  },
]

// Additional common services that can be offered regardless of the specific issue
const commonServices = [
  {
    service: "Oil Change",
    description: "Replace engine oil and filter.",
  },
  {
    service: "Tire Rotation",
    description: "Rotate tires for even wear.",
  },
  {
    service: "Multi-Point Inspection",
    description: "Check all major vehicle systems.",
  },
  {
    service: "Fluid Top-Off",
    description: "Refill essential fluids to proper levels.",
  },
]

// Define car issue options
const carIssueOptions = [
  {
    id: "warning_lights",
    label: "Warning Lights On",
    icon: AlertTriangle,
    description: "Dashboard warning lights are illuminated",
  },
  {
    id: "battery_issues",
    label: "Battery Issues",
    icon: Battery,
    description: "Car won't start or battery dies quickly",
  },
  {
    id: "engine_performance",
    label: "Engine Performance",
    icon: Gauge,
    description: "Rough idle, stalling, or power loss",
  },
  {
    id: "overheating",
    label: "Overheating",
    icon: Thermometer,
    description: "Engine temperature too high",
  },
  {
    id: "fluid_leaks",
    label: "Fluid Leaks",
    icon: Droplet,
    description: "Visible fluid leaking under vehicle",
  },
  {
    id: "mechanical_damage",
    label: "Mechanical Damage",
    icon: Wrench,
    description: "Physical damage to components",
  },
  {
    id: "electrical_problems",
    label: "Electrical Problems",
    icon: Zap,
    description: "Issues with lights, electronics, or wiring",
  },
  {
    id: "needs_towing",
    label: "Needs Towing",
    icon: Truck,
    description: "Vehicle cannot be driven to service location",
  },
  {
    id: "unusual_noises",
    label: "Unusual Noises",
    icon: Volume2,
    description: "Knocking, grinding, or squealing sounds",
  },
  {
    id: "vibration",
    label: "Vibration",
    icon: Vibrate,
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
        "gear",
        "shifting",
        "clutch",
        "automatic",
        "manual",
        "slipping",
        "grinding",
        "delayed",
        "jerking",
      ],
      responses: [
        {
          conditions: ["slipping", "delayed"],
          service: "Transmission Diagnostic",
          description: "Checks fluid levels and clutch plates.",
        },
        {
          conditions: ["grinding", "jerking"],
          service: "Transmission Inspection",
          description: "Examines transmission mounts and gears.",
        },
      ],
    },
    {
      name: "Brakes",
      keywords: [
        "brake",
        "brakes",
        "stopping",
        "squealing",
        "squeaking",
        "grinding",
        "soft",
        "pedal",
        "abs",
        "pulsating",
      ],
      responses: [
        {
          conditions: ["squealing", "squeaking"],
          service: "Brake Inspection",
          description: "Checks brake pads and rotors for wear.",
        },
        {
          conditions: ["soft", "pedal"],
          service: "Brake System Diagnostic",
          description: "Examines brake lines and checks for leaks.",
        },
      ],
    },
    {
      name: "Electrical",
      keywords: [
        "battery",
        "electrical",
        "starting",
        "alternator",
        "lights",
        "dimming",
        "starter",
        "dead",
        "charging",
        "fuse",
      ],
      responses: [
        {
          conditions: ["battery", "dead", "starting"],
          service: "Electrical System Diagnostic",
          description: "Tests battery and starter function.",
        },
        {
          conditions: ["alternator", "dimming"],
          service: "Charging System Diagnostic",
          description: "Checks alternator output and charging.",
        },
      ],
    },
    {
      name: "Suspension",
      keywords: [
        "suspension",
        "steering",
        "bouncing",
        "shocks",
        "struts",
        "alignment",
        "pulling",
        "vibration",
        "bumpy",
        "handling",
      ],
      responses: [
        {
          conditions: ["bouncing", "bumpy"],
          service: "Suspension Inspection",
          description: "Examines shocks and struts condition.",
        },
        {
          conditions: ["pulling", "alignment"],
          service: "Alignment Check",
          description: "Measures and adjusts wheel alignment.",
        },
      ],
    },
    {
      name: "Cooling",
      keywords: [
        "cooling",
        "overheating",
        "temperature",
        "coolant",
        "radiator",
        "thermostat",
        "leak",
        "steam",
        "fan",
        "heat",
      ],
      responses: [
        {
          conditions: ["overheating", "temperature"],
          service: "Cooling System Diagnostic",
          description: "Checks thermostat and radiator function.",
        },
        {
          conditions: ["leak", "coolant"],
          service: "Cooling System Inspection",
          description: "Pressure tests system and inspects for leaks.",
        },
      ],
    },
  ],
}

// Enhance the getAIDiagnostics function to return at least 3 relevant services
function getAIDiagnostics(carIssue: string) {
  if (!carIssue.trim()) {
    return null
  }

  const issue = carIssue.toLowerCase()
  let possibleServices: { service: string; description: string; confidence: number }[] = []

  // Default services if no specific matches are found
  const defaultServices = [
    {
      service: "General Inspection",
      description: "Identify specific issues with your vehicle.",
      confidence: 0.5,
    },
    {
      service: "Diagnostic Scan",
      description: "Computer scan to identify error codes and electronic issues.",
      confidence: 0.45,
    },
    {
      service: "Maintenance Check",
      description: "Review of vehicle's maintenance needs and requirements.",
      confidence: 0.4,
    },
  ]

  // Analyze each category
  for (const category of diagnosticSystem.categories) {
    // Check how many keywords match
    const matchingKeywords = category.keywords.filter((keyword) => issue.includes(keyword))

    if (matchingKeywords.length > 0) {
      // Calculate match confidence based on keyword matches
      const keywordConfidence = matchingKeywords.length / category.keywords.length

      // Check specific conditions within the category
      for (const response of category.responses) {
        const matchingConditions = response.conditions.filter((condition) => issue.includes(condition))

        if (matchingConditions.length > 0) {
          const conditionConfidence = matchingConditions.length / response.conditions.length
          const totalConfidence = (keywordConfidence + conditionConfidence) / 2

          possibleServices.push({
            service: response.service,
            description: response.description,
            confidence: totalConfidence,
          })
        }
      }

      // If no specific conditions matched but we matched keywords, add a general category service
      if (
        possibleServices.filter((s) => s.service.includes(category.name)).length === 0 &&
        matchingKeywords.length > 1
      ) {
        possibleServices.push({
          service: `${category.name} System Inspection`,
          description: `Complete inspection of your vehicle's ${category.name.toLowerCase()} system.`,
          confidence: keywordConfidence * 0.8,
        })
      }
    }
  }

  // Sort by confidence
  possibleServices.sort((a, b) => b.confidence - a.confidence)

  // If we don't have enough services, add some defaults
  if (possibleServices.length === 0) {
    possibleServices = [...defaultServices]
  } else if (possibleServices.length < 3) {
    // Add related services based on the matched category
    const highestConfidenceService = possibleServices[0]

    // Find which category the highest confidence service belongs to
    let relatedCategory = null
    for (const category of diagnosticSystem.categories) {
      if (highestConfidenceService.service.includes(category.name)) {
        relatedCategory = category.name
        break
      }
    }

    // Add related services from default list
    let remainingDefaultsToAdd = 3 - possibleServices.length
    for (const defaultService of defaultServices) {
      // Skip if already have a similar service
      if (possibleServices.some((s) => s.service === defaultService.service)) {
        continue
      }

      possibleServices.push({
        ...defaultService,
        description: relatedCategory
          ? defaultService.description + ` Focus on ${relatedCategory.toLowerCase()} components.`
          : defaultService.description,
      })

      remainingDefaultsToAdd--
      if (remainingDefaultsToAdd <= 0) break
    }
  }

  // Return top 3 services instead of 2
  return possibleServices.slice(0, 3)
}

// Get all available services (AI suggestions + common services)
const getAllServices = (aiSuggestions: Array<{ service: string; description: string; confidence: number }> | null) => {
  const services = [
    ...(aiSuggestions || []),
    ...commonServices.filter((cs) => !aiSuggestions?.some((ai) => ai.service === cs.service)),
  ]

  // Add more services if we don't have enough to demonstrate scrolling
  if (services.length < 6) {
    const additionalServices = [
      {
        service: "Brake Pad Replacement",
        description: "Replace worn brake pads for better stopping.",
        confidence: 0.35,
      },
      {
        service: "Wheel Alignment",
        description: "Adjust wheel angles to specifications.",
        confidence: 0.33,
      },
      {
        service: "Battery Replacement",
        description: "Install new battery with testing.",
        confidence: 0.32,
      },
      {
        service: "Air Filter Replacement",
        description: "Replace filter for better performance.",
        confidence: 0.31,
      },
      {
        service: "Spark Plug Replacement",
        description: "Replace plugs for improved efficiency.",
        confidence: 0.3,
      },
    ]

    // Add as many additional services as needed to reach at least 8 total
    let i = 0
    while (services.length < 8 && i < additionalServices.length) {
      if (!services.some((s) => s.service === additionalServices[i].service)) {
        services.push(additionalServices[i])
      }
      i++
    }
  }

  return services
}

export default function BookAppointment() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = router.pathname
  const appointmentId = searchParams.get("appointmentId")

  const [formData, setFormData] = useState<BookingFormData>({
    issueDescription: "",
    phoneNumber: "",
    carRuns: null,
    selectedServices: [],
    selectedCarIssues: [],
  })

  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    service: string
    description: string
    confidence: number
  }> | null>(defaultRecommendedServices)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasInteractedWithTextArea, setHasInteractedWithTextArea] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [appointmentData, setAppointmentData] = useState<any>(null)

  // Fetch appointment data on component mount
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!appointmentId) {
        console.error("No appointment ID provided")
        setIsLoading(false)
        return
      }

      try {
        // Force refresh the schema cache
        await supabase.rpc("reload_schema_cache")

        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .eq("id", appointmentId)
          .single()

        if (error) throw error

        setAppointmentData(data)
        console.log("Fetched appointment data:", data)
      } catch (error) {
        console.error("Error fetching appointment data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentData()
  }, [appointmentId])

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
      formatted = `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`
    }

    setFormData((prev) => ({ ...prev, phoneNumber: formatted }))
  }

  // Toggle service selection
  const toggleService = (service: string) => {
    setFormData((prev) => {
      const newSelectedServices = prev.selectedServices.includes(service)
        ? prev.selectedServices.filter((s) => s !== service)
        : [...prev.selectedServices, service]

      return { ...prev, selectedServices: newSelectedServices }
    })
  }

  // Toggle car issue selection
  const toggleCarIssue = (issueId: string) => {
    setFormData((prev) => {
      const newSelectedCarIssues = prev.selectedCarIssues.includes(issueId)
        ? prev.selectedCarIssues.filter((id) => id !== issueId)
        : [...prev.selectedCarIssues, issueId]

      return { ...prev, selectedCarIssues: newSelectedCarIssues }
    })
  }

  // Handle text area focus and input
  const handleTextAreaFocus = () => {
    setHasInteractedWithTextArea(true)
    // Show default recommendations when user focuses on the text area
    if (!aiSuggestions && !formData.issueDescription.trim()) {
      setAiSuggestions(defaultRecommendedServices)
    }
  }

  // Handle car issue description changes
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, issueDescription: value }))
  }

  // Handle car runs selection - now using boolean values
  const handleCarRunsChange = (value: boolean) => {
    setFormData((prev) => ({ ...prev, carRuns: value }))
  }

  // Update AI suggestions based on issue description
  useEffect(() => {
    // Skip this effect if we're still loading initial data
    if (!hasInteractedWithTextArea && !formData.issueDescription) {
      return
    }

    // Update AI suggestions if there's text in the description
    if (formData.issueDescription.trim().length > 0) {
      const result = getAIDiagnostics(formData.issueDescription)
      if (result) {
        // Only update if different from current suggestions
        if (!aiSuggestions || JSON.stringify(result) !== JSON.stringify(aiSuggestions)) {
          setAiSuggestions(result)
        }
      }
    } else if (hasInteractedWithTextArea) {
      // Show default recommendations if text area is empty and user has interacted
      if (JSON.stringify(aiSuggestions) !== JSON.stringify(defaultRecommendedServices)) {
        setAiSuggestions(defaultRecommendedServices)
      }
    }
  }, [formData.issueDescription, hasInteractedWithTextArea, aiSuggestions])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setValidationError(null)

    try {
      // Get the current user or sign in anonymously
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      let userId: string

      if (user) {
        // Use the authenticated user's ID
        userId = user.id
      } else {
        // Sign in anonymously using Supabase's built-in function
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
        
        if (anonError) {
          console.error('Error signing in anonymously:', anonError)
          throw new Error('Failed to create anonymous user. Please try again.')
        }

        if (!anonData.user) {
          throw new Error('Failed to create anonymous user. Please try again.')
        }

        userId = anonData.user.id
      }

      // Prepare appointment data
      const appointmentData = {
        user_id: userId,
        location: "Mobile Service",
        appointment_date: new Date().toISOString(),
        status: "pending",
        source: "web",
        car_runs: formData.carRuns,
        issue_description: formData.issueDescription,
        selected_services: formData.selectedServices,
        selected_car_issues: formData.selectedCarIssues,
        phone_number: formData.phoneNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log("Creating appointment with data:", appointmentData)

      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select()
        .single()

      if (appointmentError) {
        console.error("Supabase error creating appointment:", appointmentError)
        throw appointmentError
      }

      if (!appointment) {
        throw new Error("Failed to create appointment")
      }

      // Show success message
      toast({
        title: "Success!",
        description: "Your appointment has been booked successfully.",
      })
      
      // Redirect to pick mechanic page
      router.push(`/pick-mechanic?appointmentId=${appointment.id}`)

    } catch (err) {
      console.error("Error creating appointment:", err)
      setValidationError(err instanceof Error ? err.message : "Failed to create appointment")
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if form is valid
  const isFormValid =
    formData.phoneNumber && // Phone number is required
    (formData.issueDescription || formData.selectedServices.length > 0) // Either description OR service selection

  // Get all available services
  const allServices = getAllServices(aiSuggestions)

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!appointmentId || !appointmentData) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p>We couldn't find your appointment information. Please return to the home page and try again.</p>
              <div className="mt-4">
                <a href="/" className="text-[#294a46] font-medium hover:underline">
                  Return to Home
                </a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Book An Appointment</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              {/* Left half - Car issue description */}
              <div className="space-y-2 md:w-1/2">
                <p className="text-center md:text-left text-gray-600">Tell us what happened</p>
                <textarea
                  value={formData.issueDescription}
                  onChange={handleDescriptionChange}
                  onFocus={handleTextAreaFocus}
                  placeholder="Example: My car won't start. When I turn the key, I hear a clicking sound.

or type Oil Change"
                  className="w-full px-4 py-3 border border-gray-200 rounded-md bg-gray-50 min-h-[110px]"
                  style={{ lineHeight: 1.5 }}
                />
              </div>

              {/* Right half - Phone Number and Car Runs */}
              <div className="space-y-3 md:w-1/2 flex flex-col items-center justify-center">
                {/* Phone Number Input */}
                <div className="space-y-0.5 w-full flex flex-col items-center">
                  <div className="flex items-center justify-center mb-1">
                    <Phone className="h-4 w-4 text-gray-500 mr-2" />
                    <p className="text-gray-600 text-sm">
                      Phone Number <span className="text-red-500">*</span>
                    </p>
                  </div>
                  <div className="relative max-w-[200px] w-full">
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="(###)-### ####"
                      className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-center"
                      required
                    />
                  </div>
                </div>

                {/* Does your car run? - Updated to use boolean values */}
                <div className="space-y-1 w-full flex flex-col items-center">
                  <p className="text-center text-gray-600 text-sm">Does your car run?</p>
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => handleCarRunsChange(true)}
                      className={`px-8 py-2 rounded-full border transition-colors ${
                        formData.carRuns === true
                          ? "bg-[#294a46] text-white border-[#294a46]"
                          : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCarRunsChange(false)}
                      className={`px-8 py-2 rounded-full border transition-colors ${
                        formData.carRuns === false
                          ? "bg-[#294a46] text-white border-[#294a46]"
                          : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendations - Now full width */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden mb-4">
              <h4 className="text-sm font-medium text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                Recommended Services
                <div className="flex items-center text-[#294a46] text-[10px]">
                  <Lightbulb className="h-2 w-2 mr-1" />
                  <p className="font-medium">axle ai recommends</p>
                </div>
              </h4>

              <div className="p-4">
                {aiSuggestions && aiSuggestions.length > 0 ? (
                  <div className="flex flex-row space-x-4">
                    {aiSuggestions.map((suggestion, index) => (
                      <div
                        key={`ai-${index}`}
                        onClick={() => toggleService(suggestion.service)}
                        className={`flex-1 p-2 rounded-md border cursor-pointer transition-colors ${
                          formData.selectedServices.includes(suggestion.service)
                            ? "bg-[#e6eeec] border-[#294a46]/20"
                            : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-[#294a46] text-sm">{suggestion.service}</h4>
                            <div
                              className={`w-4 h-4 ml-1 rounded-full flex items-center justify-center ${
                                formData.selectedServices.includes(suggestion.service)
                                  ? "bg-[#294a46] text-white"
                                  : "border border-gray-300"
                              }`}
                            >
                              {formData.selectedServices.includes(suggestion.service) && <Check className="h-2 w-2" />}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{suggestion.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-6">No recommendations available</div>
                )}
              </div>
            </div>

            {/* Car Issues Section with Multiple Selection - Now Optional */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <p className="text-center text-gray-600">Select Car Issues</p>
                {formData.selectedCarIssues.length > 0 && (
                  <div className="bg-[#e6eeec] text-[#294a46] text-xs px-2 py-1 rounded-full">
                    {formData.selectedCarIssues.length} selected
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                {[...carIssueOptions]
                  .sort((a, b) => {
                    // Sort by label length to put shorter labels (one line) first
                    return a.label.length - b.label.length
                  })
                  .map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleCarIssue(option.id)}
                      className={`px-2 py-3 rounded-lg border text-center transition-colors ${
                        formData.selectedCarIssues.includes(option.id)
                          ? "bg-[#294a46] text-white border-[#294a46]"
                          : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <option.icon className="h-5 w-5 mb-1" />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {validationError && <div className="text-red-500 text-center font-medium mb-2">{validationError}</div>}

            <div className="flex justify-center gap-4 pt-4">
              <a
                href="/"
                className="px-8 py-3 border border-[#294a46] text-[#294a46] rounded-full hover:bg-gray-50 transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
              >
                Back
              </a>
              <button
                type="submit"
                className={`px-8 py-3 bg-[#294a46] text-white rounded-full transform transition-all duration-200 
                  ${isSubmitting || !isFormValid ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"}`}
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Processing...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
