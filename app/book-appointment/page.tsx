"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Check,
  ChevronRight,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
// Common car makes for the dropdown
const CAR_MAKES = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "Cadillac",
  "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford", "Genesis", "GMC",
  "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover",
  "Lexus", "Lincoln", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mini", "Mitsubishi",
  "Nissan", "Porsche", "Ram", "Rolls-Royce", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
]
// Car models by make (simplified for common makes)
const CAR_MODELS: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "4Runner", "Tacoma", "Tundra", "Prius", "Sienna", "Avalon"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Fit", "Passport", "Insight"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger", "Expedition", "Bronco", "Fusion", "Focus"],
  Chevrolet: ["Silverado", "Equinox", "Tahoe", "Traverse", "Malibu", "Camaro", "Suburban", "Colorado", "Blazer", "Trax"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "7 Series", "X1", "X7", "4 Series", "2 Series", "i4"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE", "S-Class", "A-Class", "GLA", "GLB", "CLA", "G-Class"],
  Audi: ["A4", "Q5", "A6", "Q7", "A3", "Q3", "A5", "Q8", "e-tron", "A7"],
  Nissan: ["Altima", "Rogue", "Sentra", "Pathfinder", "Murano", "Frontier", "Kicks", "Armada", "Maxima", "Titan"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe", "Sonata", "Kona", "Palisade", "Venue", "Accent", "Ioniq", "Veloster"],
  Kia: ["Forte", "Sportage", "Sorento", "Soul", "Telluride", "Seltos", "Rio", "Niro", "Carnival", "K5"],
  Subaru: ["Outback", "Forester", "Crosstrek", "Impreza", "Ascent", "Legacy", "WRX", "BRZ", "Solterra"],
  Volkswagen: ["Jetta", "Tiguan", "Atlas", "Passat", "Golf", "Taos", "ID.4", "Arteon", "Atlas Cross Sport"],
  Jeep: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Renegade", "Gladiator", "Wagoneer", "Grand Wagoneer"],
  Lexus: ["RX", "NX", "ES", "GX", "IS", "UX", "LX", "LS", "RC", "LC"],
  Mazda: ["CX-5", "Mazda3", "CX-9", "CX-30", "Mazda6", "MX-5 Miata", "CX-50"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Acura: ["MDX", "RDX", "TLX", "ILX", "NSX", "Integra"],
  Buick: ["Encore", "Enclave", "Envision", "Encore GX"],
  Cadillac: ["XT5", "Escalade", "XT4", "CT5", "XT6", "CT4"],
  Chrysler: ["Pacifica", "300"],
  Dodge: ["Charger", "Challenger", "Durango", "Hornet"],
  GMC: ["Sierra", "Terrain", "Acadia", "Yukon", "Canyon", "Hummer EV"],
  Infiniti: ["QX60", "QX50", "QX80", "Q50", "QX55"],
  Lincoln: ["Corsair", "Nautilus", "Aviator", "Navigator"],
  Mitsubishi: ["Outlander", "Eclipse Cross", "Outlander Sport", "Mirage"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan", "718 Cayman", "718 Boxster"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Volvo: ["XC90", "XC60", "XC40", "S60", "S90", "V60", "V90"],
}
// For makes not in our predefined list, provide some generic models
const GENERIC_MODELS = ["Sedan", "SUV", "Coupe", "Truck", "Hatchback", "Convertible", "Wagon", "Van", "Crossover"]
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
// Define database schema types
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
// Define database schema types
// Enhance the getAIDiagnostics function to return at least 3 relevant services
function getAIDiagnostics(carIssue: string): Array<{ service: string; description: string; confidence: number }> | null {
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
// Define database schema types
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
// Define database schema types
export default function BookAppointment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Fix the appointment ID extraction - check for both parameter names
  // but don't fall back to pathname for route-based IDs
  const appointmentId = searchParams.get("appointment_id") || searchParams.get("appointmentId") || null
  
  const [formData, setFormData] = useState<BookingFormData>({
    issueDescription: "",
    phoneNumber: "",
    carRuns: null,
    selectedServices: [],
    selectedCarIssues: [],
    location: "",
    vin: "",
    year: "",
    make: "",
    model: "",
    mileage: "",
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
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null)
  
  // Form refs for progressive navigation
  const locationRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLSelectElement>(null)
  const makeRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const vinRef = useRef<HTMLInputElement>(null)
  const mileageRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  // Dropdown states for make/model selection
  const [makeSearchTerm, setMakeSearchTerm] = useState("")
  const [modelSearchTerm, setModelSearchTerm] = useState("")
  const [showMakeDropdown, setShowMakeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const makeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // Current year for dropdown
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  // Filter makes based on search term
  const filteredMakes = CAR_MAKES.filter((make) => 
    make.toLowerCase().includes(makeSearchTerm.toLowerCase())
  )

  // Get models for the selected make
  const getModelsForMake = (make: string) => {
    return CAR_MODELS[make] || GENERIC_MODELS
  }

  // Filter models based on search term
  const filteredModels = formData.make
    ? getModelsForMake(formData.make).filter((model) => 
        model.toLowerCase().includes(modelSearchTerm.toLowerCase())
      )
    : []

  // Progressive navigation with Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      
      const currentElement = e.currentTarget
      const currentName = currentElement.getAttribute('name') || currentElement.getAttribute('data-field')
      
      switch (currentName) {
        case 'location':
          yearRef.current?.focus()
          break
        case 'year':
          makeRef.current?.focus()
          break
        case 'make':
          if (formData.make) {
            modelRef.current?.focus()
          }
          break
        case 'model':
          vinRef.current?.focus()
          break
        case 'vin':
          mileageRef.current?.focus()
          break
        case 'mileage':
          descriptionRef.current?.focus()
          break
        case 'issueDescription':
          phoneRef.current?.focus()
          break
        case 'phoneNumber':
          continueButtonRef.current?.focus()
          break
        default:
          break
      }
    }
  }, [formData.make])

  // Handle make selection
  const handleMakeSelect = (selectedMake: string) => {
    setFormData((prev) => ({ ...prev, make: selectedMake, model: "" }))
    setMakeSearchTerm(selectedMake)
    setShowMakeDropdown(false)
    setModelSearchTerm("")
    // Automatically focus model field after selection
    setTimeout(() => modelRef.current?.focus(), 100)
  }

  // Handle model selection
  const handleModelSelect = (selectedModel: string) => {
    setFormData((prev) => ({ ...prev, model: selectedModel }))
    setModelSearchTerm(selectedModel)
    setShowModelDropdown(false)
    // Automatically focus next field after selection
    setTimeout(() => vinRef.current?.focus(), 100)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (makeDropdownRef.current && !makeDropdownRef.current.contains(event.target as Node)) {
        setShowMakeDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Update search terms when form data changes (for pre-filled data)
  useEffect(() => {
    if (formData.make && formData.make !== makeSearchTerm) {
      setMakeSearchTerm(formData.make)
    }
    if (formData.model && formData.model !== modelSearchTerm) {
      setModelSearchTerm(formData.model)
    }
  }, [formData.make, formData.model, makeSearchTerm, modelSearchTerm])
  
  // Fetch existing appointment and vehicle data ONLY if we have a valid appointment ID
  useEffect(() => {
    const fetchAppointmentData = async () => {
      // Only fetch if we have a valid UUID-format appointment ID
      if (!appointmentId) {
        console.log("No appointment ID provided - this is a new appointment creation")
        setIsLoading(false)
        return
      }
      
      // Validate that the appointmentId looks like a UUID (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(appointmentId)) {
        console.log("Invalid appointment ID format, treating as new appointment:", appointmentId)
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        console.log("Fetching appointment data for ID:", appointmentId)
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*)
          `)
          .eq("id", appointmentId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log("Appointment not found, treating as new appointment")
          } else {
            console.error("Error fetching appointment data:", error)
          }
          setIsLoading(false)
          return
        }

        if (data) {
          setAppointmentData(data)
          // --- PRE-FILL FORM DATA ---
          setFormData(prev => ({
            ...prev,
            location: data.location || "",
            issueDescription: data.issue_description || "",
            phoneNumber: data.phone_number || "",
            carRuns: data.car_runs,
            selectedServices: data.selected_services || [],
            selectedCarIssues: data.selected_car_issues || [],
            vin: data.vehicles?.vin || "",
            year: data.vehicles?.year?.toString() || "",
            make: data.vehicles?.make || "",
            model: data.vehicles?.model || "",
            mileage: data.vehicles?.mileage?.toString() || "",
          }))
          console.log("Fetched and pre-filled appointment data:", data)
        }
      } catch (error: unknown) {
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
      // Always-Create-User System: Handle phone number merging
      const currentUserId = appointmentData?.user_id
      
      if (!currentUserId) {
        throw new Error("Invalid appointment - no user ID found")
      }
      
      // Normalize phone number for matching
      const normalizedPhone = formData.phoneNumber.replace(/\D/g, '')
      
      // Use Supabase function to merge users by phone number
      const { data: finalUserId, error: mergeError } = await supabase.rpc(
        'merge_users_by_phone',
        {
          p_phone: normalizedPhone,
          p_current_user_id: currentUserId
        }
      )
      
      if (mergeError) {
        throw new Error(`Failed to process phone number: ${mergeError.message}`)
      }
      
      if (!finalUserId) {
        throw new Error("Failed to get final user ID")
      }
      
      // Update appointment with phone number and final user ID
      const now = new Date().toISOString()
      
      // Update appointment data (never upsert - appointment already exists from landing page)
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .update({
          user_id: finalUserId, // Use final user ID (might be merged)
          location: formData.location,
          car_runs: formData.carRuns,
          issue_description: formData.issueDescription,
          selected_services: formData.selectedServices,
          selected_car_issues: formData.selectedCarIssues,
          phone_number: formData.phoneNumber,
          updated_at: now
        })
        .eq('id', appointmentId)
        .select()
        .single();
      if (appointmentError) throw appointmentError;
      if (!appointment) {
        throw new Error("Failed to create appointment")
      }

      // --- FIX STARTS HERE ---
      // After creating the appointment, create the associated vehicle record.
      // NOTE: This assumes the vehicle form fields are being added to this page's state.
      console.log("Creating vehicle for new appointment:", appointment.id);
      const vehicleData = {
        appointment_id: appointment.id,
        vin: formData.vin,
        year: parseInt(formData.year) || null,
        make: formData.make,
        model: formData.model,
        mileage: parseInt(formData.mileage) || null,
      };

      // Check if a vehicle already exists for this appointment
      const { data: existingVehicle, error: vehicleFetchError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("appointment_id", appointment.id)
        .single();

      if (vehicleFetchError && vehicleFetchError.code !== "PGRST116") { // PGRST116: No rows found
        throw new Error("Error checking for existing vehicle: " + vehicleFetchError.message);
      }

      if (!existingVehicle) {
        // Only insert if no vehicle exists
        const { error: vehicleError } = await supabase
          .from("vehicles")
          .insert(vehicleData);

        if (vehicleError) {
          // If vehicle creation fails, roll back the appointment to prevent orphans.
          console.error("Error creating vehicle, rolling back appointment...", vehicleError);
          await supabase.from("appointments").delete().eq("id", appointment.id);
          throw new Error(`Failed to create vehicle: ${vehicleError.message}`);
        }
        console.log("Vehicle created successfully for appointment:", appointment.id);
      } else {
        // Update existing vehicle with new data
        const { error: vehicleUpdateError } = await supabase
          .from("vehicles")
          .update({
            vin: formData.vin,
            year: parseInt(formData.year) || null,
            make: formData.make,
            model: formData.model,
            mileage: parseInt(formData.mileage) || null,
            updated_at: now
          })
          .eq("appointment_id", appointment.id);

        if (vehicleUpdateError) {
          throw new Error(`Failed to update vehicle: ${vehicleUpdateError.message}`);
        }
        console.log("Vehicle updated successfully for appointment:", appointment.id);
      }
      // --- FIX ENDS HERE ---

      toast({
        title: "Success!",
        description: "Your appointment has been saved.",
      })
      router.push(`/pick-mechanic?appointmentId=${appointment.id}`)
    } catch (err) {
      console.error("Error creating/updating appointment:", err)
      setValidationError(err instanceof Error ? err.message : "Failed to save appointment")
      toast({
        title: "Error",
        description: "Failed to save appointment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  // Check if form is valid
  const isFormValid =
    formData.location.trim() &&      // Location is required
    formData.year.trim() &&          // Year is required  
    formData.make.trim() &&          // Make is required
    formData.model.trim() &&         // Model is required
    formData.phoneNumber && // Phone number is required
    (formData.issueDescription || formData.selectedServices.length > 0) // Either description OR service selection
  // Get all available services
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
            {/* Vehicle Information Section */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
              <h3 className="text-lg font-medium text-gray-900 px-4 py-3 border-b border-gray-100">
                Vehicle Information
              </h3>
              <div className="p-4 space-y-4">
                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={locationRef}
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter address where service is needed"
                    className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    required
                  />
                </div>

                {/* Year Dropdown */}
                <div>
                  <label htmlFor="vehicle-year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      ref={yearRef}
                      id="vehicle-year"
                      name="year"
                      value={formData.year}
                      onChange={(e) => setFormData((prev) => ({ ...prev, year: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      required
                    >
                      <option value="">Select Year</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Make Dropdown */}
                <div>
                  <label htmlFor="vehicle-make" className="block text-sm font-medium text-gray-700 mb-1">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={makeDropdownRef}>
                    <input
                      ref={makeRef}
                      id="vehicle-make"
                      type="text"
                      name="make"
                      value={makeSearchTerm}
                      onChange={(e) => {
                        setMakeSearchTerm(e.target.value)
                        setShowMakeDropdown(true)
                        if (e.target.value !== formData.make) {
                          setFormData((prev) => ({ ...prev, make: "", model: "" }))
                        }
                      }}
                      onFocus={() => setShowMakeDropdown(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Select or type a make"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>

                    {showMakeDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredMakes.length > 0 ? (
                          filteredMakes.map((make) => (
                            <div
                              key={make}
                              onClick={() => handleMakeSelect(make)}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            >
                              {make}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">No makes found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Dropdown */}
                <div>
                  <label htmlFor="vehicle-model" className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={modelDropdownRef}>
                    <input
                      ref={modelRef}
                      id="vehicle-model"
                      type="text"
                      name="model"
                      value={modelSearchTerm}
                      onChange={(e) => {
                        setModelSearchTerm(e.target.value)
                        setShowModelDropdown(true)
                        if (e.target.value !== formData.model) {
                          setFormData((prev) => ({ ...prev, model: "" }))
                        }
                      }}
                      onFocus={() => {
                        if (formData.make) {
                          setShowModelDropdown(true)
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={formData.make ? "Select or type a model" : "Select a make first"}
                      disabled={!formData.make}
                      className={cn(
                        "block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]",
                        !formData.make && "bg-gray-50 cursor-not-allowed"
                      )}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>

                    {showModelDropdown && formData.make && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((model) => (
                            <div
                              key={model}
                              onClick={() => handleModelSelect(model)}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            >
                              {model}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">No models found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  {/* VIN */}
                  <div className="flex-1">
                    <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
                      VIN (optional)
                    </label>
                    <input
                      ref={vinRef}
                      id="vin"
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter VIN"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    />
                  </div>

                  {/* Mileage */}
                  <div className="flex-1">
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage
                    </label>
                    <input
                      ref={mileageRef}
                      id="mileage"
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mileage: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter mileage"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              {/* Left half - Car issue description */}
              <div className="space-y-2 md:w-1/2">
                <p className="text-center md:text-left text-gray-600">Tell us what happened</p>
                <textarea
                  ref={descriptionRef}
                  name="issueDescription"
                  value={formData.issueDescription}
                  onChange={handleDescriptionChange}
                  onFocus={handleTextAreaFocus}
                  onKeyDown={handleKeyDown}
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
                    <div className="h-4 w-4 text-gray-500 mr-2">📞</div>
                    <p className="text-gray-600 text-sm">
                      Phone Number <span className="text-red-500">*</span>
                    </p>
                  </div>
                  <div className="relative max-w-[200px] w-full">
                    <input
                      ref={phoneRef}
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handlePhoneChange}
                      onKeyDown={handleKeyDown}
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
                  <div className="h-2 w-2 mr-1">💡</div>
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
                        <span className="h-5 w-5 mb-1">
                          <option.icon />
                        </span>
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
                ref={continueButtonRef}
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