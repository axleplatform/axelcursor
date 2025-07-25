"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Suspense } from "react"
import {
  Check,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import MediaUpload from "@/components/MediaUpload"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


// Common service patterns for instant recommendations (mobile-friendly only)
const COMMON_SERVICE_PATTERNS = {
  // OIL CHANGE PATTERNS
  oil: {
    patterns: ['oil change', 'change oil', 'oil service', 'need oil', 'oil due'],
    services: [
      {
        service: 'Full Synthetic Oil Change',
        description: 'Complete oil and filter replacement with full synthetic',
        confidence: 0.95
      },
      {
        service: 'Synthetic Blend Oil Change',
        description: 'Oil and filter change with synthetic blend',
        confidence: 0.90
      },
      {
        service: 'Oil System Inspection',
        description: 'Check oil level, condition, and look for leaks',
        confidence: 0.85
      }
    ]
  },
  
  // BRAKE PATTERNS
  brake: {
    patterns: ['brake', 'braking', 'stop', 'pedal', 'squeak', 'grinding'],
    services: [
      {
        service: 'Brake Pad Inspection',
        description: 'Visual inspection of brake pad thickness and condition',
        confidence: 0.95
      },
      {
        service: 'Brake Pad Replacement',
        description: 'Replace front or rear brake pads',
        confidence: 0.90
      },
      {
        service: 'Brake Fluid Service',
        description: 'Brake fluid replacement and system bleeding',
        confidence: 0.85
      }
    ]
  },
  
  // BATTERY PATTERNS
  battery: {
    patterns: ['battery', 'start', 'dead', 'jump', 'clicking', 'won\'t start'],
    services: [
      {
        service: 'Battery Testing',
        description: 'Test battery condition and charging system',
        confidence: 0.95
      },
      {
        service: 'Battery Replacement',
        description: 'Remove old battery and install new one',
        confidence: 0.90
      },
      {
        service: 'Battery Terminal Service',
        description: 'Clean terminals and check connections',
        confidence: 0.85
      }
    ]
  },
  
  // TIRE PATTERNS (mobile-friendly only)
  tire: {
    patterns: ['tire', 'flat', 'pressure', 'tpms', 'spare'],
    services: [
      {
        service: 'Tire Pressure Check',
        description: 'Check and adjust all tire pressures',
        confidence: 0.95
      },
      {
        service: 'Tire Rotation',
        description: 'Rotate tires for even wear',
        confidence: 0.90
      },
      {
        service: 'Spare Tire Installation',
        description: 'Remove flat and install spare tire',
        confidence: 0.85
      }
    ]
  },
  
  // AIR FILTER PATTERNS
  filter: {
    patterns: ['filter', 'air filter', 'cabin', 'dusty', 'airflow'],
    services: [
      {
        service: 'Engine Air Filter',
        description: 'Replace engine air filter',
        confidence: 0.95
      },
      {
        service: 'Cabin Air Filter',
        description: 'Replace interior cabin air filter',
        confidence: 0.90
      },
      {
        service: 'Filter Inspection',
        description: 'Check all filters and recommend if needed',
        confidence: 0.85
      }
    ]
  },
  
  // COOLANT PATTERNS
  coolant: {
    patterns: ['coolant', 'antifreeze', 'overheat', 'temperature', 'radiator'],
    services: [
      {
        service: 'Coolant Level Check',
        description: 'Check coolant level and condition',
        confidence: 0.95
      },
      {
        service: 'Coolant Top-Off',
        description: 'Add coolant to proper level',
        confidence: 0.90
      },
      {
        service: 'Cooling System Inspection',
        description: 'Check for leaks and test coolant strength',
        confidence: 0.85
      }
    ]
  },
  
  // WIPER PATTERNS
  wiper: {
    patterns: ['wiper', 'windshield', 'streak', 'rain', 'visibility'],
    services: [
      {
        service: 'Wiper Blade Replacement',
        description: 'Replace front windshield wiper blades',
        confidence: 0.95
      },
      {
        service: 'Rear Wiper Replacement',
        description: 'Replace rear windshield wiper blade',
        confidence: 0.90
      },
      {
        service: 'Washer Fluid Service',
        description: 'Fill windshield washer fluid reservoir',
        confidence: 0.85
      }
    ]
  },
  
  // BELT PATTERNS
  belt: {
    patterns: ['belt', 'squeal', 'serpentine', 'broken belt'],
    services: [
      {
        service: 'Serpentine Belt Inspection',
        description: 'Check belt condition for cracks or wear',
        confidence: 0.95
      },
      {
        service: 'Belt Replacement',
        description: 'Replace worn or damaged belt',
        confidence: 0.90
      },
      {
        service: 'Belt Tension Adjustment',
        description: 'Adjust belt tension to specification',
        confidence: 0.85
      }
    ]
  },
  
  // FLUID CHECK PATTERNS
  fluid: {
    patterns: ['fluid', 'leak', 'low', 'check fluids', 'top off'],
    services: [
      {
        service: 'Fluid Level Check',
        description: 'Check all fluid levels and conditions',
        confidence: 0.95
      },
      {
        service: 'Fluid Top-Off Service',
        description: 'Top off low fluids as needed',
        confidence: 0.90
      },
      {
        service: 'Leak Inspection',
        description: 'Identify source of fluid leaks',
        confidence: 0.85
      }
    ]
  },
  
  // SPARK PLUG PATTERNS
  spark: {
    patterns: ['spark plug', 'misfire', 'rough idle', 'tune up'],
    services: [
      {
        service: 'Spark Plug Replacement',
        description: 'Replace spark plugs',
        confidence: 0.95
      },
      {
        service: 'Ignition System Check',
        description: 'Test spark plug wires and coils',
        confidence: 0.90
      },
      {
        service: 'Engine Performance Check',
        description: 'Basic engine performance evaluation',
        confidence: 0.85
      }
    ]
  },
  
  // LIGHT PATTERNS
  light: {
    patterns: ['headlight', 'taillight', 'bulb', 'light out', 'blinker'],
    services: [
      {
        service: 'Headlight Bulb Replacement',
        description: 'Replace headlight bulbs',
        confidence: 0.95
      },
      {
        service: 'Taillight Bulb Replacement',
        description: 'Replace brake or taillight bulbs',
        confidence: 0.90
      },
      {
        service: 'Turn Signal Bulb Service',
        description: 'Replace turn signal bulbs',
        confidence: 0.85
      }
    ]
  },
  
  // INSPECTION PATTERNS
  inspection: {
    patterns: ['inspect', 'check', 'diagnose', 'look at', 'evaluate'],
    services: [
      {
        service: 'General Vehicle Inspection',
        description: 'Visual inspection of major components',
        confidence: 0.95
      },
      {
        service: 'Maintenance Check',
        description: 'Review maintenance needs and recommendations',
        confidence: 0.90
      },
      {
        service: 'Safety Inspection',
        description: 'Check safety-related components',
        confidence: 0.85
      }
    ]
  }
}

// Fuzzy matching for common typos
const typoPatterns = {
  'break': 'brake',  // Common typo
  'breakpad': 'brake pad',
  'oilchnage': 'oil change',
  'battry': 'battery',
  'tyre': 'tire',
  'wiperblade': 'wiper blade',
  'sparkplug': 'spark plug',
  'headlight': 'head light',
  'taillight': 'tail light',
  'turn signal': 'turn signal',
  'air filter': 'air filter',
  'cabin filter': 'cabin filter',
  'serpentine belt': 'serpentine belt',
  'coolant level': 'coolant level',
  'brake fluid': 'brake fluid',
  'oil filter': 'oil filter',
  'transmission fluid': 'transmission fluid',
  'power steering': 'power steering',
  'washer fluid': 'washer fluid'
}

// Smart pattern matching function with multiple detection and fuzzy matching
// Features:
// - Multiple pattern detection: "I need an oil change and my brakes are squeaking" matches both oil and brake patterns
// - Fuzzy matching: Fixes common typos like "break" → "brake", "battry" → "battery"
// - Duplicate removal: Returns top 3 unique services when multiple patterns match
// - Mobile-friendly: All services doable by mobile mechanics without shop equipment
// - Gemini override: Only used for simple text queries under 50 characters with no media
const findMatchingServices = (description: string) => {
  const lowerDesc = description.toLowerCase()
  const words = lowerDesc.split(/\s+/)
  const matches: any[] = []
  
  // First, apply fuzzy matching to fix common typos
  let correctedDescription = lowerDesc
  for (const [typo, correction] of Object.entries(typoPatterns)) {
    if (correctedDescription.includes(typo)) {
      correctedDescription = correctedDescription.replace(new RegExp(typo, 'g'), correction)
      console.log(`🔧 Fixed typo: "${typo}" → "${correction}"`)
    }
  }
  
  // Check each service category for matches (use first match only for priority)
  for (const [category, data] of Object.entries(COMMON_SERVICE_PATTERNS)) {
    // Check if any pattern matches
    for (const pattern of data.patterns) {
      if (correctedDescription.includes(pattern)) {
        console.log('Pattern matched:', pattern)
        console.log(`✅ Matched pattern: "${pattern}" → ${category} services`)
        
        // Return first match only for priority system
        let services = [...data.services]
        
        // Error handling: If less than 3 services, duplicate to fill
        while (services.length < 3) {
          services.push(...data.services.slice(0, 3 - services.length))
        }
        
        return {
          services: services.slice(0, 3),
          matchedPattern: pattern,
          category: category,
          skipGemini: true
        }
      }
    }
  }
  
  return null // No pattern matched
}

// Define types for form data
interface BookingFormData {
  issueDescription: string
  phoneNumber: string
  carRuns: boolean | null
  selectedServices: string[]
  selectedCarIssues: string[]
  location: string
  preferredDate: string
  preferredTime: string
  vin: string
  year: string
  make: string
  model: string
  mileage: string
  licensePlate: string
}

// Define types for media files
interface MediaFile {
  type: string
  data: string // base64 data
  name: string
  size: number
  mimeType?: string
}

interface UploadedMediaFile {
  type: string
  url: string
  name: string
  size: number
  mimeType?: string
}

interface GeminiService {
  service: string
  description: string
}

// Define database schema types
interface AppointmentData {
  id: string
  user_id: string
  location: string
  latitude?: number
  longitude?: number
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
function BookAppointmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Fix the appointment ID extraction - check for 'id' parameter from order-service page
  const appointmentId = searchParams.get("id") || searchParams.get("appointment_id") || searchParams.get("appointmentId") || null
  
  const [formData, setFormData] = useState<BookingFormData>({
    issueDescription: "",
    phoneNumber: "",
    carRuns: null,
    selectedServices: [],
    selectedCarIssues: [],
    location: "",
    preferredDate: "",
    preferredTime: "",
    vin: "",
    year: "",
    make: "",
    model: "",
    mileage: "",
    licensePlate: "",
  })
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    service: string
    description: string
    confidence: number
  }> | null>(null)
  const [patternMatched, setPatternMatched] = useState(false)
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  const [isFromPattern, setIsFromPattern] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasInteractedWithTextArea, setHasInteractedWithTextArea] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [carRunsValidationError, setCarRunsValidationError] = useState<string | null>(null)
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null)
  const [hadPreviousQuotes, setHadPreviousQuotes] = useState(false)
  
  // Media upload states
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([])
  const [processingMedia, setProcessingMedia] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [geminiDebounceTimer, setGeminiDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [patternDebounceTimer, setPatternDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [recordedAudio, setRecordedAudio] = useState<MediaFile | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  

  
  // Fetch existing appointment and vehicle data ONLY if we have a valid appointment ID
  useEffect(() => {
    const fetchAppointmentData = async () => {
      console.log("🔍 [DEBUG] BookAppointment - appointmentId from URL:", appointmentId)
      console.log("🔍 [DEBUG] BookAppointment - searchParams:", Object.fromEntries(searchParams.entries()))
      
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
          
          // Notify mechanics about the appointment update from book-appointment page
          if (appointmentId && data) {
            try {
              // Use the correct Supabase realtime API for broadcasting
              const { error } = await supabase
                .from('appointments')
                .update({ 
                  updated_at: new Date().toISOString(),
                  edited_from: 'book_appointment_page'
                })
                .eq('id', appointmentId);
                
              if (error) {
                console.error('⚠️ Warning: Could not update appointment timestamp:', error);
              } else {
                console.log('📢 Updated appointment timestamp to notify mechanics about appointment update from book-appointment page');
              }
            } catch (error) {
              console.error('⚠️ Warning: Could not send real-time notification:', error);
            }
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching appointment data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentData()
  }, [appointmentId])

  // REMOVED: No longer need to notify from book-appointment page since landing page sends notification after all updates
  // The landing page now sends the notification AFTER all database updates are complete

  // Check if appointment had quotes before editing
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && appointmentId) {
      const checkExistingQuotes = async () => {
        try {
          const { data: quotes, error } = await supabase
            .from('mechanic_quotes')
            .select('id')
            .eq('appointment_id', appointmentId);
          
          if (error) {
            console.error('Error checking existing quotes:', error);
            return;
          }
          
          if (quotes && quotes.length > 0) {
            console.log('📝 Appointment had previous quotes, marking for edit tracking');
            setHadPreviousQuotes(true);
          }
        } catch (error) {
          console.error('Error checking existing quotes:', error);
        }
      };
      checkExistingQuotes();
    }
  }, [appointmentId, searchParams]);

  // When loading existing appointment for edit mode
  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    if (editMode && appointmentData) {
      console.log('📝 Loading existing appointment data for edit mode:', appointmentData);
      
      setFormData(prev => ({
        ...prev,
        // PRESERVE these values from existing appointment
        location: appointmentData.location || prev.location,
        preferredDate: appointmentData.appointment_date ? appointmentData.appointment_date.split('T')[0] : prev.preferredDate,
        preferredTime: appointmentData.appointment_date ? (() => {
          // Parse the UTC datetime and convert to local time for time extraction
          const utcDate = new Date(appointmentData.appointment_date);
          console.log('🔍 [DATE DEBUG] UTC datetime from DB:', appointmentData.appointment_date);
          console.log('🔍 [DATE DEBUG] Parsed UTC date object:', utcDate);
          console.log('🔍 [DATE DEBUG] Local time components:', {
            hours: utcDate.getHours(),
            minutes: utcDate.getMinutes()
          });
          
          // Extract local time in HH:MM format
          const hours = String(utcDate.getHours()).padStart(2, '0');
          const minutes = String(utcDate.getMinutes()).padStart(2, '0');
          const localTime = `${hours}:${minutes}`;
          console.log('🔍 [DATE DEBUG] Extracted local time:', localTime);
          return localTime;
        })() : prev.preferredTime,
        issueDescription: appointmentData.issue_description || prev.issueDescription,
        phoneNumber: appointmentData.phone_number || prev.phoneNumber,
        carRuns: appointmentData.car_runs !== null ? appointmentData.car_runs : prev.carRuns,
        selectedServices: appointmentData.selected_services || prev.selectedServices,
        selectedCarIssues: appointmentData.selected_car_issues || prev.selectedCarIssues,
        // Vehicle information
        vin: appointmentData.vehicles?.vin || prev.vin,
        year: appointmentData.vehicles?.year?.toString() || prev.year,
        make: appointmentData.vehicles?.make || prev.make,
        model: appointmentData.vehicles?.model || prev.model,
        mileage: appointmentData.vehicles?.mileage?.toString() || prev.mileage,
      }));
      
      console.log('✅ Form data updated for edit mode');
    }
  }, [searchParams, appointmentData]);
  // Save phone number to session storage
  const savePhoneToSession = (phone: string) => {
    if (phone) {
      sessionStorage.setItem('customer_phone', phone);
    }
  };

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
    
    // Save phone to session storage
    savePhoneToSession(formatted);
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
  // Handle car issue description changes - just save data, no API calls
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, issueDescription: value }))
    
    // Clear existing pattern debounce timer
    if (patternDebounceTimer) {
      clearTimeout(patternDebounceTimer)
    }
    
    // Only check patterns for simple text under 50 chars (no API calls)
    const timer = setTimeout(() => {
      if (value.length < 50) {
        const patternMatch = findMatchingServices(value)
        if (patternMatch) {
          console.log('✅ Pattern matched for simple query:', value)
          setAiSuggestions(patternMatch.services)
          setPatternMatched(true)
          setAiSuggestionsLoading(false)
        } else {
          setPatternMatched(false)
          setAiSuggestionsLoading(false)
        }
      } else {
        setPatternMatched(false)
        setAiSuggestionsLoading(false)
      }
    }, 1000) // 1 second debounce for pattern matching
    
    setPatternDebounceTimer(timer)
  }
  // Handle car runs selection - SINGLE TRIGGER POINT for Gemini API
  const handleCarRunsChange = (value: boolean) => {
    setFormData((prev) => ({ ...prev, carRuns: value }))
    
    // NOW check all conditions for API call
    const hasValidInput = formData.issueDescription.length >= 50 || uploadedFiles.length > 0 || recordedAudio !== null
    
    if (hasValidInput) {
      console.log('🎯 Car runs answered - checking conditions for API call')
      
      // Check patterns first for simple text
      if (!uploadedFiles.length && !recordedAudio && formData.issueDescription.length < 50) {
        const patternMatch = findMatchingServices(formData.issueDescription)
        if (patternMatch) {
          console.log('✅ Pattern matched for simple query:', formData.issueDescription)
          setAiSuggestions(patternMatch.services)
          setPatternMatched(true)
          setAiSuggestionsLoading(false)
          return
        }
      }
      
      // Call Gemini for complex/media cases
      console.log('🎯 Using Gemini API: Complex issue or media present')
      setPatternMatched(false)
      setAiSuggestionsLoading(true)
      analyzeWithGemini(uploadedFiles)
    } else {
      console.log('⏳ Car runs answered but no valid input yet')
      setPatternMatched(false)
      setAiSuggestionsLoading(false)
    }
  }

  // Handle media upload changes - just save data, no API calls
  const handleMediaUpload = async (files: File[]) => {
    try {
      // Convert File[] to MediaFile[] properly
      const mediaFiles: MediaFile[] = await Promise.all(
        files.map(file => convertFileToMediaFile(file))
      )
      setUploadedFiles(mediaFiles)
      
      console.log('📁 Media files uploaded - waiting for car runs answer')
    } catch (error) {
      console.error('Error converting files:', error)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      setRecordingError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(audioBlob)
        })
        
        const audioFile: MediaFile = {
          type: 'audio',
          data: base64.split(',')[1],
          name: `voice-recording-${Date.now()}.webm`,
          size: audioBlob.size,
          mimeType: 'audio/webm'
        }
        
        setRecordedAudio(audioFile)
        setAudioChunks([])
        
        // Add to uploaded files
        const newFiles = [...uploadedFiles, audioFile].slice(0, 3)
        setUploadedFiles(newFiles)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      // Store timer reference
      ;(recorder as any).timer = timer
      
    } catch (error) {
      console.error('Recording error:', error)
      setRecordingError('Microphone access denied. Please allow microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      
      // Clear timer
      if ((mediaRecorder as any).timer) {
        clearInterval((mediaRecorder as any).timer)
      }
    }
  }

  const deleteRecording = () => {
    setRecordedAudio(null)
    setRecordingTime(0)
    setRecordingError(null)
    
    // Remove from uploaded files
    const newFiles = uploadedFiles.filter(file => file !== recordedAudio)
    setUploadedFiles(newFiles)
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Analyze input with Gemini multimodal API
  const analyzeWithGemini = async (files: MediaFile[]) => {
    setProcessingMedia(true)
    setMediaError(null)
    setIsFromPattern(false) // Reset pattern state when using Gemini

    try {
      const formDataToSend = new FormData()
      
      // Add vehicle data
      formDataToSend.append('year', formData.year || '')
      formDataToSend.append('make', formData.make || '')
      formDataToSend.append('model', formData.model || '')
      formDataToSend.append('mileage', formData.mileage || '')
      
      // Add car running status
      formDataToSend.append('carRuns', formData.carRuns?.toString() || '')
      
      // Add text description
      formDataToSend.append('description', formData.issueDescription)
      
      // Add media files
      if (files && files.length > 0) {
        files.forEach(file => {
          // Convert base64 back to file for FormData
          const byteCharacters = atob(file.data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: file.mimeType })
          const fileObj = new File([blob], file.name, { type: file.mimeType })
          formDataToSend.append('files', fileObj)
        })
      }

      const response = await fetch('/api/gemini-multimodal', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data.services) {
        // Convert Gemini response to match existing AI suggestions format
        const geminiSuggestions = result.data.services.map((service: GeminiService) => ({
          service: service.service,
          description: service.description,
          confidence: 0.9 // Default confidence since we removed it from API
        }))
        
        setAiSuggestions(geminiSuggestions)
      }
    } catch (error) {
      console.error('Gemini analysis error:', error)
      // Silent fallback - no error message shown
    } finally {
      setProcessingMedia(false)
    }
  }

  // Upload media files to Supabase storage
  const uploadMediaToStorage = async (files: MediaFile[]): Promise<UploadedMediaFile[]> => {
    if (!files || files.length === 0) return []
    
    const uploadedFiles = []
    
    for (const file of files) {
      try {
        // Convert base64 to blob
        const byteCharacters = atob(file.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: file.mimeType })
        
        // Generate unique filename
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}-${randomId}.${fileExtension}`
        
        // Upload to Supabase storage
        const { data, error } = await (supabase.storage as any)
          .from('appointment-media')
          .upload(fileName, blob, {
            contentType: file.mimeType,
            cacheControl: '3600'
          })
        
        if (error) {
          console.error('Storage upload error:', error)
          continue
        }
        
        // Get public URL
        const { data: urlData } = (supabase.storage as any)
          .from('appointment-media')
          .getPublicUrl(fileName)
        
        uploadedFiles.push({
          type: file.type,
          url: urlData.publicUrl,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType
        })
        
      } catch (error) {
        console.error('File upload error:', error)
      }
    }
    
    return uploadedFiles
  }
  // Update AI suggestions based on issue description, media, and car running status
  useEffect(() => {
    // Skip this effect if we're still loading initial data
    if (!hasInteractedWithTextArea && !formData.issueDescription) {
      return
    }

    // Skip if we have pattern-based recommendations (don't override them)
    if (patternMatched) {
      console.log('🛡️ Skipping useEffect - pattern-based recommendations active')
      return
    }

    // Clear existing debounce timer
    if (geminiDebounceTimer) {
      clearTimeout(geminiDebounceTimer)
    }

    // Set new debounce timer for 3 seconds
    const timer = setTimeout(() => {
      // Only show default recommendations if no input and user has interacted
      if (hasInteractedWithTextArea && !formData.issueDescription.trim() && uploadedFiles.length === 0) {
        if (JSON.stringify(aiSuggestions) !== JSON.stringify(defaultRecommendedServices)) {
          setAiSuggestions(defaultRecommendedServices)
        }
      }
    }, 3000)

    setGeminiDebounceTimer(timer)

    // Cleanup timer on unmount
    return () => {
      if (timer) clearTimeout(timer)
      if (patternDebounceTimer) clearTimeout(patternDebounceTimer)
    }
  }, [formData.issueDescription, uploadedFiles, hasInteractedWithTextArea, patternMatched])
  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    if (formData.issueDescription || formData.selectedServices.length > 0 || formData.selectedCarIssues.length > 0) {
      sessionStorage.setItem('axle-book-appointment-form-data', JSON.stringify(formData))
    }
  }, [formData])

  // Load phone number from session storage on page load
  useEffect(() => {
    const savedPhone = sessionStorage.getItem('customer_phone');
    if (savedPhone && !formData.phoneNumber) {
      setFormData(prev => ({ ...prev, phoneNumber: savedPhone }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setValidationError(null)
    
    // VALIDATION: Check required fields before proceeding (silent - no error messages)
    if (formData.carRuns === null) {
      setIsSubmitting(false)
      return
    }
    
    if (!formData.phoneNumber) {
      setIsSubmitting(false)
      return
    }
    
    if (!formData.issueDescription && formData.selectedServices.length === 0) {
      setIsSubmitting(false)
      return
    }
    
    try {
      // Check if we're in edit mode
      const isEditMode = searchParams.get('edit') === 'true'
      
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
      
      // Upload media files to storage if any
      const mediaFilesData = await uploadMediaToStorage(uploadedFiles)
      
      // Prepare AI analysis results
      const aiAnalysisResults = aiSuggestions ? {
        services: aiSuggestions.map(suggestion => ({
          service: suggestion.service,
          description: suggestion.description
        })),
        analyzed_at: now
      } : null
      
      // Update appointment data (never upsert - appointment already exists from landing page)
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .update({
          user_id: finalUserId, // Use final user ID (might be merged)
          status: 'pending', // Explicitly set to pending to ensure it appears in Available Appointments
          car_runs: formData.carRuns,
          issue_description: formData.issueDescription,
          selected_services: formData.selectedServices,
          selected_car_issues: formData.selectedCarIssues,
          phone_number: formData.phoneNumber,
          // Media files and AI analysis
          media_files: mediaFilesData,
          ai_analysis_results: aiAnalysisResults,
          // Clear any previous selections to ensure fresh start
          selected_quote_id: null,
          mechanic_id: null,
          // Handle editing protection
          is_being_edited: false, // Re-enable quoting
          updated_at: now
        })
        .eq('id', appointmentId)
        .select()
        .single();
      if (appointmentError) throw appointmentError;
      if (!appointment) {
        throw new Error("Failed to create appointment")
      }

      // If in edit mode, clear all existing quotes and notify mechanics
      if (isEditMode) {
        console.log('🔄 Edit mode detected - clearing existing quotes and notifying mechanics')
        
        if (hadPreviousQuotes) {
          console.log('📝 Appointment had previous quotes - implementing edit tracking')
          
          // Reset appointment to "quotable" state with edit tracking
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              edited_after_quotes: true,
              mechanic_notified_of_edit: true,
              last_edited_at: now
            })
            .eq('id', appointmentId)
          
          if (updateError) {
            console.error('⚠️ Warning: Could not update edit tracking:', updateError)
          } else {
            console.log('✅ Edit tracking updated')
          }
        }
        
        // Delete all existing quotes for this appointment (prices are now invalid)
        const { error: quotesError } = await supabase
          .from('mechanic_quotes')
          .delete()
          .eq('appointment_id', appointmentId)
        
        if (quotesError) {
          console.error('⚠️ Warning: Could not clear existing quotes:', quotesError)
          // Don't throw error for this - it's not critical
        } else {
          console.log('✅ All existing quotes cleared')
        }
        
        // Create notifications for mechanics who quoted
        if (hadPreviousQuotes) {
          const { error: notificationError } = await supabase
            .from('appointment_edit_notifications')
            .insert({
              appointment_id: appointmentId,
              message: 'Customer edited appointment details. Please submit a new quote.'
            })
          
          if (notificationError) {
            console.error('⚠️ Warning: Could not create edit notifications:', notificationError)
          } else {
            console.log('✅ Edit notifications created for mechanics')
          }
        }
        
        // Also notify via real-time for backward compatibility
        const { error: realtimeError } = await supabase
          .from('appointment_updates')
          .insert({
            appointment_id: appointmentId,
            update_type: 'details_changed',
            message: 'Customer updated appointment details. Previous quotes have been cleared.'
          })
        
        if (realtimeError) {
          console.error('⚠️ Warning: Could not send real-time notification to mechanics:', realtimeError)
          // Don't throw error for this - it's not critical
        } else {
          console.log('✅ Mechanics notified of appointment update via real-time')
        }
      }

      // Real-time updates will be handled by existing subscriptions
      console.log('✅ Appointment created successfully - real-time updates handled by existing subscription')

      toast({
        title: "Success!",
        description: isEditMode ? "Your appointment has been updated and mechanics have been notified." : "Your appointment has been saved.",
      })
      // Clear sessionStorage since we're moving to the next step
      sessionStorage.removeItem('axle-book-appointment-form-data')
      
      router.push(`/pick-mechanic?appointment_id=${appointment.id}`)
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
    formData.phoneNumber && // Phone number is required
    (formData.issueDescription || formData.selectedServices.length > 0) && // Either description OR service selection
    formData.carRuns !== null; // Car runs must be selected

  // Handle appointment updates (separate from initial submission)
  const handleUpdateAppointment = async () => {
    if (!appointmentId || !appointmentData) {
      toast({
        title: "Error",
        description: "No appointment data found to update.",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    if (!formData.phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required.",
        variant: "destructive"
      })
      return
    }

    if (!formData.issueDescription && formData.selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Please provide either an issue description or select services.",
        variant: "destructive"
      })
      return
    }

    if (formData.carRuns === null) {
      toast({
        title: "Error",
        description: "Please select if your car runs or not.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      console.log('🔄 Starting appointment update process...')

      // Track actual changes
      const actualChanges: any = {}
      let hasRealChanges = false

      // Check each field for actual changes
      if (appointmentData.location !== formData.location) {
        actualChanges.location = formData.location
        hasRealChanges = true
      }
      
      if (appointmentData.appointment_date !== (formData.preferredDate + 'T' + formData.preferredTime)) {
        actualChanges.appointment_date = formData.preferredDate + 'T' + formData.preferredTime
        hasRealChanges = true
      }
      
      if (appointmentData.issue_description !== formData.issueDescription) {
        actualChanges.issue_description = formData.issueDescription
        hasRealChanges = true
      }
      
      if (appointmentData.phone_number !== formData.phoneNumber) {
        actualChanges.phone_number = formData.phoneNumber
        hasRealChanges = true
      }
      
      if (appointmentData.car_runs !== formData.carRuns) {
        actualChanges.car_runs = formData.carRuns
        hasRealChanges = true
      }
      
      if (JSON.stringify(appointmentData.selected_services) !== JSON.stringify(formData.selectedServices)) {
        actualChanges.selected_services = formData.selectedServices
        hasRealChanges = true
      }
      
      if (JSON.stringify(appointmentData.selected_car_issues) !== JSON.stringify(formData.selectedCarIssues)) {
        actualChanges.selected_car_issues = formData.selectedCarIssues
        hasRealChanges = true
      }

      // Check vehicle changes
      const vehicleChanges: any = {}
      let hasVehicleChanges = false
      
      if (appointmentData.vehicles?.vin !== formData.vin) {
        vehicleChanges.vin = formData.vin || null
        hasVehicleChanges = true
      }
      
      if (appointmentData.vehicles?.year?.toString() !== formData.year) {
        vehicleChanges.year = formData.year ? parseInt(formData.year) : null
        hasVehicleChanges = true
      }
      
      if (appointmentData.vehicles?.make !== formData.make) {
        vehicleChanges.make = formData.make || null
        hasVehicleChanges = true
      }
      
      if (appointmentData.vehicles?.model !== formData.model) {
        vehicleChanges.model = formData.model || null
        hasVehicleChanges = true
      }
      
      if (appointmentData.vehicles?.mileage?.toString() !== formData.mileage) {
        vehicleChanges.mileage = formData.mileage ? parseInt(formData.mileage) : null
        hasVehicleChanges = true
      }

      console.log('🔍 Change detection:', {
        hasRealChanges,
        hasVehicleChanges,
        actualChanges,
        vehicleChanges
      })

      if (hasRealChanges || hasVehicleChanges) {
        console.log('🔄 Changes detected - resetting appointment completely')

        // Always-Create-User System: Handle phone number merging if phone changed
        if (actualChanges.phone_number) {
          const currentUserId = appointmentData.user_id
          
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
          
          actualChanges.user_id = finalUserId
        }

        // Update vehicle information if changed
        if (hasVehicleChanges) {
          if (appointmentData.vehicles) {
            // Update existing vehicle
            const { error: vehicleError } = await supabase
              .from('vehicles')
              .update(vehicleChanges)
              .eq('appointment_id', appointmentId)

            if (vehicleError) {
              console.error('⚠️ Warning: Could not update vehicle:', vehicleError)
            } else {
              console.log('✅ Vehicle updated successfully')
            }
          } else {
            // Create new vehicle record
            const { error: vehicleError } = await supabase
              .from('vehicles')
              .insert({
                appointment_id: appointmentId,
                ...vehicleChanges
              })

            if (vehicleError) {
              console.error('⚠️ Warning: Could not create vehicle:', vehicleError)
            } else {
              console.log('✅ Vehicle created successfully')
            }
          }
        }

        // ONLY NOW reset the appointment with actual changes
        const appointmentUpdates = {
          ...actualChanges,
          status: 'pending',  // Reset to pending
          selected_quote_id: null,  // Clear selected quote
          mechanic_id: null,  // Clear assigned mechanic
          is_being_edited: false,  // No longer being edited
          edited_after_quotes: true,  // Mark as edited
          updated_at: new Date().toISOString()
        }

        // Update appointment
        const { error: updateError } = await supabase
          .from('appointments')
          .update(appointmentUpdates)
          .eq('id', appointmentId)

        if (updateError) {
          console.error('❌ Failed to update appointment:', updateError)
          throw updateError
        }

        console.log('✅ Appointment updated successfully')

        // Delete quotes only if changed
        const { error: deleteQuotesError } = await supabase
          .from('mechanic_quotes')
          .delete()
          .eq('appointment_id', appointmentId)

        if (deleteQuotesError) {
          console.error('⚠️ Warning: Could not delete existing quotes:', deleteQuotesError)
        } else {
          console.log('✅ All existing quotes deleted')
        }

        // Clear mechanic skips (so they can quote again)
        const { error: deleteSkipsError } = await supabase
          .from('mechanic_skipped_appointments')
          .delete()
          .eq('appointment_id', appointmentId)

        if (deleteSkipsError) {
          console.error('⚠️ Warning: Could not clear mechanic skips:', deleteSkipsError)
        } else {
          console.log('✅ All mechanic skips cleared')
        }

        // Notify mechanics via real-time
        const { error: realtimeError } = await supabase
          .from('appointment_updates')
          .insert({
            appointment_id: appointmentId,
            update_type: 'details_changed',
            message: 'Customer updated appointment details. Previous quotes have been cleared.'
          })

        if (realtimeError) {
          console.error('⚠️ Warning: Could not send real-time notification:', realtimeError)
        } else {
          console.log('✅ Mechanics notified of appointment update via real-time')
        }
        
        // Also send channel notification for immediate updates
        try {
          await supabase.channel('appointment-updates')
            .send({
              type: 'broadcast',
              event: 'appointment_edited',
              payload: {
                appointment_id: appointmentId,
                edited_at: new Date().toISOString()
              }
            });
            
          console.log('📢 Sent immediate channel notification to mechanics');
        } catch (error) {
          console.error('⚠️ Warning: Could not send channel notification:', error);
        }

        console.log('✅ Appointment edited and reset to available')
        toast({
          title: "Success!",
          description: "Appointment updated! Mechanics will see your changes.",
        })
      } else {
        console.log('✅ No changes detected, just clearing editing flag')
        
        // No changes made, just clear editing flag
        const { error: clearError } = await supabase
          .from('appointments')
          .update({ is_being_edited: false })
          .eq('id', appointmentId)

        if (clearError) {
          console.error('⚠️ Warning: Could not clear editing flag:', clearError)
        }

        toast({
          title: "No Changes",
          description: "No changes were made to the appointment.",
        })
      }

      // Navigate to pick mechanic page
      router.push(`/pick-mechanic?appointment_id=${appointmentId}`)
    } catch (error) {
      console.error('❌ Error updating appointment:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update appointment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
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
          <h1 className="text-3xl font-bold text-center text-[#294a46] mb-6">Book An Appointment</h1>
          <form onSubmit={(e) => {
            e.preventDefault()
            // Check if we're in edit mode
            const isEditMode = searchParams.get('edit') === 'true'
            if (isEditMode) {
              handleUpdateAppointment()
            } else {
              handleSubmit(e)
            }
          }} className="space-y-6">
            {/* Description Box - Full Width */}
            <div className="space-y-4">
              <p className="text-center md:text-left text-gray-600">Tell us what happened</p>
              <div className="relative">
                <textarea
                  value={formData.issueDescription}
                  onChange={handleDescriptionChange}
                  onFocus={handleTextAreaFocus}
                  placeholder="Describe your car's issue in detail...
or simply type the service you want.

💡 Tip: You can also upload media to help diagnose the issue"
                  className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-md bg-gray-50 min-h-[110px]"
                  style={{ lineHeight: 1.5 }}
                />
                {/* Voice recording button - Above + button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`absolute bottom-12 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    isRecording 
                      ? "bg-transparent border-2 border-red-500 text-red-500 animate-pulse" 
                      : "bg-transparent border-2 border-[#294a46] text-[#294a46] hover:bg-[#294a46]/10"
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice message"}
                >
                  <span className="text-lg">🎤</span>
                </button>
                {/* Plus button for file upload */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*,audio/*,video/*';
                    input.onchange = async (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      if (files.length > 0) {
                        // Convert files to base64 and MediaFile format
                        const mediaFiles: MediaFile[] = await Promise.all(
                          files.map(async (file) => {
                            const base64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.readAsDataURL(file);
                            });
                            
                            return {
                              type: file.type.startsWith('image/') ? 'image' : 
                                    file.type.startsWith('audio/') ? 'audio' : 'video',
                              data: base64.split(',')[1], // Remove data URL prefix
                              name: file.name,
                              size: file.size,
                              mimeType: file.type
                            };
                          })
                        );
                        
                        // Add to existing files (respect max limit)
                        const newFiles = [...uploadedFiles, ...mediaFiles].slice(0, 3);
                        setUploadedFiles(newFiles);
                      }
                    };
                    input.click();
                  }}
                  className="absolute bottom-3 right-3 w-8 h-8 bg-[#294a46] text-white rounded-full flex items-center justify-center hover:bg-[#1e3632] transition-colors shadow-sm"
                  title="Upload media files"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>
              
              {/* Show uploaded media preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Uploaded media ({uploadedFiles.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded text-xs">
                        <span>{file.type === 'image' ? '📷' : file.type === 'audio' ? '🎵' : '🎥'}</span>
                        <span className="truncate max-w-20">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recording status and controls */}
              {isRecording && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-red-700">Recording... {formatRecordingTime(recordingTime)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}
              
              {/* Recording error */}
              {recordingError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{recordingError}</p>
                </div>
              )}
              
              {/* Recorded audio preview */}
              {recordedAudio && !isRecording && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🎵</span>
                      <span className="text-sm text-green-700">Voice recording saved</span>
                    </div>
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              
              {/* Media error state */}
              {mediaError && (
                <div className="text-sm text-red-500 text-center">
                  {mediaError}
                </div>
              )}
            </div>

            {/* Phone Number and Car Runs - Two Column Layout on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone Number Input - Second on mobile, Left Column on desktop */}
              <div className="flex flex-col items-center justify-center space-y-2 order-2 md:order-2">
                <div className="flex items-center justify-center mb-1 text-center">
                  <div className="h-4 w-4 text-gray-500 mr-2 -translate-y-0.5">📞</div>
                  <p className="text-gray-600 text-sm">
                    Phone Number <span className="text-red-500">*</span>
                  </p>
                </div>
                <div className="w-full max-w-[200px] mx-auto">
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
              
              {/* Does your car run? - First on mobile, Right Column on desktop */}
              <div className="flex flex-col items-center justify-center space-y-2 order-1 md:order-1">
                <div className="text-center">
                  <p className="text-gray-600 text-sm">
                    Does your car run? <span className="text-red-500">*</span>
                  </p>
                </div>
                <div className="flex space-x-4 justify-center">
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
            {/* AI Recommendations - Now full width */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden mb-4">
              <h4 className="text-sm font-medium text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                Recommended Services
                <div className="flex items-center text-[#294a46] text-[10px]">
                  {isFromPattern ? (
                    <>
                      <div className="h-2 w-2 mr-1 -translate-y-0.5">✨</div>
                      <p className="font-medium">instant recommendations</p>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 mr-1 -translate-y-0.5">💡</div>
                      <p className="font-medium">axle ai recommends</p>
                    </>
                  )}
                </div>
              </h4>
              <div className="p-4">
                {processingMedia ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                      <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-[#294a46] rounded-full"></div>
                      <span>🤖 AI is analyzing your vehicle issue...</span>
                    </div>
                    <div className="flex flex-row space-x-2 sm:space-x-4">
                      {[1, 2, 3].map((index) => (
                        <div key={`loading-${index}`} className="flex-1 p-2 rounded-md border border-gray-200 bg-gray-50">
                          <div className="flex flex-col h-full">
                            <div className="mb-1">
                              <div className="flex items-center space-x-1">
                                <div className="h-3 w-3 bg-gray-300 rounded animate-pulse"></div>
                                <div className="h-3 w-16 bg-gray-300 rounded animate-pulse"></div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-2 w-full bg-gray-300 rounded animate-pulse"></div>
                              <div className="h-2 w-3/4 bg-gray-300 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : aiSuggestions && aiSuggestions.length > 0 ? (
                  <div className="flex flex-row space-x-2 sm:space-x-4">
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
                          <div className="mb-1">
                            <h4 className="font-medium text-[#294a46] text-sm">{suggestion.service}</h4>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{suggestion.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : formData.carRuns === null ? (
                  <div className="flex flex-row space-x-2 sm:space-x-4">
                    {defaultRecommendedServices.map((service, index) => (
                      <div
                        key={`default-${index}`}
                        onClick={() => toggleService(service.service)}
                        className={`flex-1 p-2 rounded-md border cursor-pointer transition-colors ${
                          formData.selectedServices.includes(service.service)
                            ? "bg-[#e6eeec] border-[#294a46]/20"
                            : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-1">
                            <h4 className="font-medium text-[#294a46] text-sm">{service.service}</h4>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{service.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-6">No recommendations available</div>
                )}
              </div>
            </div>
            {validationError && <div className="text-red-500 text-center font-medium mb-2">{validationError}</div>}
            <div className="flex justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  // Add navigation guard to prevent rapid navigation
                  if (isSubmitting) return;
                  router.push(appointmentId ? `/?appointment_id=${appointmentId}` : '/');
                }}
                className="px-8 py-3 border border-[#294a46] text-[#294a46] rounded-full hover:bg-gray-50 transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className={`px-8 py-3 text-white rounded-full transform transition-all duration-200 ${
                  isSubmitting || !isFormValid 
                    ? "bg-[#294a46]/40 cursor-not-allowed" 
                    : "bg-[#294a46] hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
                }`}
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Processing...
                  </span>
                ) : (
                  searchParams.get('edit') === 'true' ? "Update Appointment" : "Continue"
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

// Loading component for Suspense fallback
function BookAppointmentLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointment form...</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Main export with Suspense wrapper
export default function BookAppointment() {
  return (
    <Suspense fallback={<BookAppointmentLoading />}>
      <BookAppointmentContent />
    </Suspense>
  )
}

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

// Helper function to convert File to MediaFile
const convertFileToMediaFile = async (file: File): Promise<MediaFile> => {
  const base64Data = await fileToBase64(file)
  return {
    type: file.type.startsWith('image/') ? 'image' : 
          file.type.startsWith('video/') ? 'video' : 
          file.type.startsWith('audio/') ? 'audio' : 'other',
    data: base64Data,
    name: file.name,
    size: file.size,
    mimeType: file.type
  }
}
