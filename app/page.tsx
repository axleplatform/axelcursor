// @ts-nocheck
"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { MapPin, ChevronRight, User, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { DateTimeSelector } from "@/components/date-time-selector"
import { toast } from "@/components/ui/use-toast"
import HomepageLocationInput from "@/components/homepage-location-input"

// Global type declarations
declare global {
  interface Window {
    initMap?: () => void;
    mapInstance?: google.maps.Map;
  }
}

// Define types for form data
interface AppointmentFormData {
  location: string
  vin: string
  year: string
  make: string
  model: string
  mileage: string
  appointmentDate: string
  appointmentTime: string
  issueDescription?: string
  selectedServices?: string[]
  carRuns?: boolean
  latitude?: number
  longitude?: number
  place_id?: string
  phone?: string
  email?: string | null | undefined
}

// Define the update data type
interface AppointmentUpdateData {
  updated_at: string;
  is_being_edited: boolean;
  edited_after_quotes?: boolean;
  latitude?: number;
  longitude?: number;
  place_id?: string | null;
  user_id: string;
  status: string;
  appointment_date: string;
  location: string;
  issue_description?: string;
  selected_services?: string[];
  car_runs?: boolean;
  source: string;
}

interface SupabaseQueryResult {
  data: unknown
  error: unknown
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function HomePageContent(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isLoadingExistingData, setIsLoadingExistingData] = useState<boolean>(false)
  const [errors, setErrors] = useState<Partial<AppointmentFormData & { general?: string }>>({})
  const [formData, setFormData] = useState<AppointmentFormData>({
    location: "",
    vin: "",
    year: "",
    make: "",
    model: "",
    mileage: "",
    appointmentDate: "",
    appointmentTime: "",
  })

  // State for highlighting missing fields when Continue button is disabled
  const [showMissingFields, setShowMissingFields] = useState<boolean>(false)

  // Add refs for progressive navigation
  const modelRef = useRef<HTMLInputElement>(null)
  const vinRef = useRef<HTMLInputElement>(null)
  const mileageRef = useRef<HTMLInputElement>(null)
  const dateTimeSelectorRef = useRef<{ openDateDropdown: () => void; openTimeDropdown: () => void; isFormComplete: () => boolean } | null>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  // Get appointment ID from URL parameters for restoring state
  const appointmentId = searchParams?.get("appointment_id") || null

  // Add selectedLocation state
  const [selectedLocation, setSelectedLocation] = useState<google.maps.places.PlaceResult | null>(null)

  // Add map state and refs
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  // Initialize Google Maps Autocomplete
  const initializeAutocomplete = useCallback(async () => {
    if (!locationInputRef.current) return;

    try {
      const { loadGoogleMaps } = await import('@/lib/google-maps');
      const google = await loadGoogleMaps();

      // Use the new PlaceAutocompleteElement API
      const autocomplete = new google.maps.places.PlaceAutocompleteElement({
        inputElement: locationInputRef.current,
        componentRestrictions: { country: 'us' }
      });

      // The new API might need to be attached to the DOM
      if (locationInputRef.current.parentElement) {
        locationInputRef.current.parentElement.appendChild(autocomplete);
      }

      // Add event listener for place selection
      autocomplete.addEventListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('📍 Place selected:', place);
        if (place && place.geometry) {
          const address = place.formatted_address || '';
          handleLocationChange(address);
          handleLocationSelect(place);
        }
      });

      // Add debugging for autocomplete events
      autocomplete.addEventListener('place_changed', () => {
        console.log('🎯 place_changed event fired');
      });

      autocompleteRef.current = autocomplete;
      console.log('✅ PlaceAutocompleteElement initialized successfully:', autocomplete);
      
      // Add input event listener to detect typing
      locationInputRef.current.addEventListener('input', () => {
        setTimeout(() => {
          const allGmpxElements = document.querySelectorAll('[class*="gmpx"]');
          const allAutocompleteElements = document.querySelectorAll('[class*="autocomplete"]');
          const allDropdownElements = document.querySelectorAll('[class*="dropdown"], [class*="picker"], [class*="suggestions"]');
          
          console.log('🔍 After typing - GMPX elements:', allGmpxElements.length);
          console.log('🔍 After typing - Autocomplete elements:', allAutocompleteElements.length);
          console.log('🔍 After typing - Dropdown elements:', allDropdownElements.length);
          
          allGmpxElements.forEach((el, index) => {
            console.log(`🔍 GMPX element ${index} after typing:`, el.className, el);
          });
          
          allDropdownElements.forEach((el, index) => {
            console.log(`🔍 Dropdown element ${index} after typing:`, el.className, el);
          });
        }, 500);
      });
      
      // Check if autocomplete container exists after initialization
      setTimeout(() => {
        const pacContainer = document.querySelector('.pac-container');
        const gmpxContainer = document.querySelector('.gmpx-place-autocomplete-picker');
        const allGmpxElements = document.querySelectorAll('[class*="gmpx"]');
        const allAutocompleteElements = document.querySelectorAll('[class*="autocomplete"]');
        
        console.log('🔍 PAC container found:', pacContainer);
        console.log('🔍 GMPX container found:', gmpxContainer);
        console.log('🔍 All GMPX elements:', allGmpxElements);
        console.log('🔍 All autocomplete elements:', allAutocompleteElements);
        
        // Log all elements with class names containing 'gmpx' or 'autocomplete'
        allGmpxElements.forEach((el, index) => {
          console.log(`🔍 GMPX element ${index}:`, el.className, el);
        });
        
        allAutocompleteElements.forEach((el, index) => {
          console.log(`🔍 Autocomplete element ${index}:`, el.className, el);
        });
        
        if (pacContainer) {
          console.log('🔍 PAC container styles:', {
            display: window.getComputedStyle(pacContainer).display,
            visibility: window.getComputedStyle(pacContainer).visibility,
            opacity: window.getComputedStyle(pacContainer).opacity,
            zIndex: window.getComputedStyle(pacContainer).zIndex
          });
        }
        if (gmpxContainer) {
          console.log('🔍 GMPX container styles:', {
            display: window.getComputedStyle(gmpxContainer).display,
            visibility: window.getComputedStyle(gmpxContainer).visibility,
            opacity: window.getComputedStyle(gmpxContainer).opacity,
            zIndex: window.getComputedStyle(gmpxContainer).zIndex
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }
  }, []);

  // Initialize autocomplete on mount
  useEffect(() => {
    if (locationInputRef.current) {
      console.log('🔍 Input element found, initializing autocomplete...');
      console.log('🔍 Input element:', locationInputRef.current);
      console.log('🔍 Input connected to DOM:', locationInputRef.current.isConnected);
      initializeAutocomplete();
    } else {
      console.log('❌ Input element not found');
    }
  }, [initializeAutocomplete]);

  // Initialize map on mount
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Clean up any existing Google Maps elements that might interfere
      const pacElements = document.querySelectorAll('.pac-container, .pac-item');
      pacElements.forEach(el => {
        try {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      });

      // Load Google Maps using the safe loader
      const { loadGoogleMaps } = await import('@/lib/google-maps');
      const google = await loadGoogleMaps();

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // NYC default
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
      });
      
      mapInstanceRef.current = map;
      setMapLoaded(true);
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (mounted && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }

    return () => {
      mounted = false;
      // Cleanup map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [initializeMap]); // Depend on memoized initializeMap function

  // Update map when location is selected
  const updateMapLocation = useCallback(async () => {
    if (!selectedLocation || !mapInstanceRef.current) return;

    try {
      // Ensure Google Maps is loaded
      if (!window.google) {
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        await loadGoogleMaps();
      }

      const map = mapInstanceRef.current;

      // Clear existing markers by setting map to null
      // Add new marker for selected location
      new window.google.maps.Marker({
        position: {
          lat: selectedLocation.geometry.location.lat(),
          lng: selectedLocation.geometry.location.lng()
        },
        map: map,
        animation: window.google.maps.Animation.DROP
      });

      // Center map on new location
      map.setCenter({
        lat: selectedLocation.geometry.location.lat(),
        lng: selectedLocation.geometry.location.lng()
      });
      map.setZoom(15);
    } catch (error) {
      console.error('Error updating map location:', error);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation && mapLoaded) {
      updateMapLocation();
    }
  }, [selectedLocation, mapLoaded, updateMapLocation]);

  // Add function to load existing appointment data
  const loadExistingAppointment = useCallback(async () => {
    if (!appointmentId) return

    setIsLoadingExistingData(true)
    try {
      console.log("🔄 Loading existing appointment data for:", appointmentId)
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          vehicles!fk_appointment_id(*)
        `)
        .eq("id", appointmentId)
        .single()

      if (error) {
        console.error("Error loading appointment:", error)
        return
      }

      if (data) {
        console.log("✅ Loaded appointment data:", data)
        
        // Restore form data from existing appointment
        setFormData(prev => ({
          ...prev,
          location: data.location || "",
          vin: data.vehicles?.vin || "",
          year: data.vehicles?.year?.toString() || "",
          make: data.vehicles?.make || "",
          model: data.vehicles?.model || "",
          mileage: data.vehicles?.mileage?.toString() || "",
          appointmentDate: data.appointment_date ? data.appointment_date.split('T')[0] : "",
          appointmentTime: data.appointment_date ? data.appointment_date.split('T')[1]?.substring(0, 5) : "",
          issueDescription: data.issue_description || "",
          selectedServices: data.selected_services || [],
          carRuns: data.car_runs,
          latitude: data.latitude,
          longitude: data.longitude,
          place_id: data.place_id
        }))

        toast({
          title: "Form Restored",
          description: "Your previous information has been loaded.",
        })
      }
    } catch (error) {
      console.error("Error loading appointment data:", error)
    } finally {
      setIsLoadingExistingData(false)
    }
  }, [appointmentId])

  // Load existing data on mount if appointment ID is present
  const loadDataFromStorage = useCallback(() => {
    const savedFormData = sessionStorage.getItem('axle-landing-form-data')
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData)
        console.log("🔄 Restoring form data from sessionStorage:", parsedData)
        setFormData(prev => ({ ...prev, ...parsedData }))
        toast({
          title: "Form Restored",
          description: "Your previous information has been restored.",
        })
      } catch (error) {
        console.error("Error parsing saved form data:", error)
      }
    }
  }, []);

  useEffect(() => {
    if (appointmentId) {
      loadExistingAppointment()
    } else {
      loadDataFromStorage()
    }
  }, [appointmentId, loadExistingAppointment, loadDataFromStorage])

  // Save form data to sessionStorage whenever it changes
  const saveFormDataToStorage = useCallback(() => {
    if (formData.location || formData.year || formData.make || formData.model) {
      sessionStorage.setItem('axle-landing-form-data', JSON.stringify(formData))
    }
  }, [formData]);

  useEffect(() => {
    saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  // Load phone and email from sessionStorage on edit mode
  const loadPhoneEmailFromStorage = useCallback(() => {
    if (appointmentId && !formData.phone) {
      const savedPhone = sessionStorage.getItem('customer_phone');
      const savedEmail = sessionStorage.getItem('customer_email');
      if (savedPhone) {
        setFormData(prev => ({ 
          ...prev, 
          phone: savedPhone,
          email: savedEmail || undefined
        }));
      }
    }
  }, [appointmentId, formData.phone]);

  useEffect(() => {
    loadPhoneEmailFromStorage();
  }, [loadPhoneEmailFromStorage]);

  // Add debug logging
  useEffect(() => {
    // Test Supabase connection
    supabase.from('appointments').select('count').then(
      ({ data, error }: SupabaseQueryResult) => {
        if (error) {
          console.error("Supabase connection error:", error)
        } else {
          console.log("Supabase connection successful:", data)
        }
      }
    )
  }, [])

  // Common car makes for the dropdown
  const makes = [
    "Acura",
    "Audi",
    "BMW",
    "Buick",
    "Cadillac",
    "Chevrolet",
    "Chrysler",
    "Dodge",
    "Ford",
    "GMC",
    "Honda",
    "Hyundai",
    "Infiniti",
    "Jaguar",
    "Jeep",
    "Kia",
    "Land Rover",
    "Lexus",
    "Lincoln",
    "Mazda",
    "Mercedes",
    "Mercury",
    "Mitsubishi",
    "Nissan",
    "Pontiac",
    "Porsche",
    "Ram",
    "Subaru",
    "Tesla",
    "Toyota",
    "Volkswagen",
    "Volvo",
  ]

  // Handle form input changes
  const handleChange = React.useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData((prev: AppointmentFormData) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name as keyof AppointmentFormData]) {
      setErrors((prev: typeof errors) => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  // Progressive navigation with Enter key
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      
      const currentField = e.currentTarget.name
      
      switch (currentField) {
        case 'model':
          vinRef.current?.focus()
          break
        case 'vin':
          mileageRef.current?.focus()
          break
        case 'mileage':
          // Open date dropdown
          if (dateTimeSelectorRef.current?.openDateDropdown) {
            dateTimeSelectorRef.current.openDateDropdown()
          }
          break
        default:
          break
      }
    }
  }, [])

  // Validate form fields
  const validateForm = React.useCallback((): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Ensure location is a string before calling trim
    const location = typeof formData.location === 'string' ? formData.location : String(formData.location || '');
    if (!location.trim()) {
      newErrors.location = "Location is required"
    }

    if (!formData.year.trim()) {
      newErrors.year = "Year is required"
    }

    if (!formData.make.trim()) {
      newErrors.make = "Make is required"
    }

    if (!formData.model.trim()) {
      newErrors.model = "Model is required"
    }

    if (!formData.appointmentDate.trim()) {
      newErrors.appointmentDate = "Date is required"
    }

    if (!formData.appointmentTime.trim()) {
      newErrors.appointmentTime = "Time is required"
    }

    // Validate appointment date: FUTURE DATES are always valid, only check time for TODAY
    if (formData.appointmentDate && formData.appointmentTime) {
      try {
        // Parse appointment date using local timezone to avoid UTC issues
        // Split the date string and create Date with explicit local timezone
        const [year, month, day] = formData.appointmentDate.split('-').map(Number)
        const appointmentDate = new Date(year, month - 1, day) // month is 0-indexed
        
        // Create today's date properly 
        const realToday = new Date() // Get actual current date/time
        const today = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate()) // Today at midnight
        
        console.log('🔍 DEBUG: Raw appointment date string:', formData.appointmentDate)
        console.log('🔍 DEBUG: Parsed appointment [year, month, day]:', [year, month, day])
        console.log('🔍 DEBUG: appointmentDate object:', appointmentDate)
        console.log('🔍 DEBUG: appointmentDate.getTime():', appointmentDate.getTime())
        console.log('🔍 DEBUG: realToday object:', realToday)
        console.log('🔍 DEBUG: today object (midnight):', today)
        console.log('🔍 DEBUG: today.getTime():', today.getTime())
        console.log('🔄 validateForm: Comparing DATES - appointment:', formData.appointmentDate, 'parsed as:', appointmentDate.toDateString(), 'today:', today.toDateString())
        
        if (isNaN(appointmentDate.getTime())) {
          console.log('❌ validateForm: Invalid date format')
          newErrors.appointmentDate = "Invalid date format"
        }
        // Step 1: If appointment DATE is in the future (tomorrow or later), ALWAYS ALLOW
        else if (appointmentDate.getTime() > today.getTime()) {
          console.log('✅ validateForm: FUTURE DATE - always valid regardless of time (June 30, 2025 at any time is OK)')
          // No validation needed for future dates - any time is acceptable
        }
        // Step 2: If appointment DATE is today, check time constraints
        else if (appointmentDate.getTime() === today.getTime()) {
          console.log('🔄 validateForm: TODAY - checking time constraints')
          
          // Special case: Immediate appointments skip all time validation
          if (formData.appointmentTime === "ASAP" || formData.appointmentTime === "now" || formData.appointmentTime === "⚡ Now") {
            console.log('⚡ validateForm: Immediate appointment detected - skipping time validation', {
              timeValue: formData.appointmentTime,
              isASAP: formData.appointmentTime === "ASAP",
              isNow: formData.appointmentTime === "now",
              isNowEmoji: formData.appointmentTime === "⚡ Now"
            })
            // No validation needed for immediate appointments
          } else {
            // Parse regular time slots
            const [hours, minutes] = formData.appointmentTime.split(':').map(Number)
            const appointmentDateTime = new Date(year, month - 1, day, hours, minutes)
            
            if (isNaN(appointmentDateTime.getTime())) {
              console.log('❌ validateForm: Invalid time format')
              newErrors.appointmentDate = "Invalid time format"
            } else {
              // Regular appointment - enforce 30-minute buffer
              const now = new Date()
              const bufferTime = new Date(now.getTime() + 30 * 60 * 1000) // Add 30 minutes
              
              if (appointmentDateTime <= bufferTime) {
                console.log('❌ validateForm: Today appointment too soon (less than 30 min buffer)')
                newErrors.appointmentDate = "Please select a time at least 30 minutes from now, or select ASAP for immediate service"
              } else {
                console.log('✅ validateForm: Today appointment with sufficient buffer')
              }
            }
          }
        }
        // Step 3: If appointment DATE is in the past, reject
        else {
          console.log('❌ validateForm: PAST DATE - rejected')
          newErrors.appointmentDate = "Appointment date cannot be in the past"
        }
        
      } catch (error) {
        console.log('❌ validateForm: Date parsing error:', error)
        newErrors.appointmentDate = "Invalid date or time format"
      }
    }

    console.log('🔄 validateForm: Setting errors:', newErrors)
    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    console.log('🔄 validateForm: Returning isValid:', isValid)
    return isValid
  }, [formData])

  // Create a temporary user record immediately (no more NULL user_id!)
  const createTemporaryUser = async () => {
    try {
      // Call Supabase function to create a temporary user
      const { data: userId, error: userError } = await supabase.rpc('create_temporary_user')

      if (userError) {
        console.error('Error creating temporary user:', userError)
        
        // If RPC function doesn't exist yet (migration not run), provide helpful error
        if (userError.message?.includes('function') || userError.code === '42883') {
          throw new Error('Database migration required: create_temporary_user function not found. Please run the migration first.')
        }
        
        throw new Error(`Database error: ${userError.message}`)
      }

      if (!userId) {
        throw new Error("No user ID returned from create_temporary_user function")
      }

      console.log('✅ Temporary user created successfully:', userId)
      return userId as string
      
    } catch (error) {
      console.error('❌ Failed to create temporary user:', error)
      throw error instanceof Error ? error : new Error('Unknown error creating user')
    }
  }

  // Handle editing appointments from landing page
  const handleEditFromLanding = async (appointmentId: string, updates: any) => {
    try {
      // Check if appointment has quotes
      const { data: quotes } = await supabase
        .from('mechanic_quotes')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('status', 'active');
      
      // If has quotes, set edited_after_quotes
      if (quotes && quotes.length > 0) {
        updates.edited_after_quotes = true;
        console.log('🔄 Setting edited_after_quotes=true for appointment with quotes');
      }
      
      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      console.log('✅ Appointment updated successfully');
    } catch (error) {
      console.error('❌ Error in handleEditFromLanding:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = React.useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    try {
      console.log('🔵 Continue button clicked - handleSubmit called')
      e.preventDefault()
      console.log('✅ preventDefault() completed')
      
      console.log('🔍 About to log Form data')
      console.log('🔍 Form data (safe):', {
        location: formData.location,
        vin: formData.vin,
        year: formData.year,
        make: formData.make,
        model: formData.model,
        mileage: formData.mileage,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        issueDescription: formData.issueDescription,
        selectedServices: formData.selectedServices,
        carRuns: formData.carRuns,
        latitude: formData.latitude,
        longitude: formData.longitude,
        place_id: formData.place_id,
        phone: formData.phone,
        email: formData.email
      })
      console.log('🔍 DEBUG appointmentTime value:', {
        appointmentTime: formData.appointmentTime,
        type: typeof formData.appointmentTime,
        length: formData.appointmentTime?.length,
        isASAP: formData.appointmentTime === "ASAP",
        isNow: formData.appointmentTime === "now",
        isNowEmoji: formData.appointmentTime === "⚡ Now"
      })
      console.log('✅ Form data logged')
      
      console.log('🔍 About to log isFormComplete')
      console.log('🔍 isFormComplete:', isFormComplete)
      console.log('✅ isFormComplete logged')
      
      console.log('🔍 About to check Supabase URL')
      console.log('🔍 Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('✅ Supabase URL checked')
      
      console.log('🔍 About to check Supabase Key')
      console.log('🔍 Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      console.log('✅ Supabase Key checked')
      
      console.log('🔍 About to check Supabase client')
      console.log('🔍 Supabase client initialized:', !!supabase)
      console.log('✅ Supabase client checked')
      
      console.log('🔄 About to call validateForm()')
      let isValid = false
      try {
        console.log('🔄 Calling validateForm() now...')
        isValid = validateForm()
        console.log('✅ validateForm() completed, result:', isValid)
      } catch (error) {
        console.log('❌ validateForm() threw an error:', error)
        setErrors({ general: 'Form validation error. Please check your inputs.' })
        return
      }
      
      console.log('🔄 About to check isValid result')
      if (!isValid) {
        console.log('❌ Form validation failed')
        return
      }
      console.log('✅ isValid check passed')

      console.log('✅ Form validation passed')
      console.log('🔄 About to call setIsSubmitting(true)')
      setIsSubmitting(true)
      console.log('✅ setIsSubmitting(true) completed')

      try {
        let appointmentDate: Date
        
        // Handle ASAP appointments by using current time
        if (formData.appointmentTime === "ASAP") {
          // For ASAP appointments, use current date and time
          appointmentDate = new Date()
          console.log('⚡ Using current time for ASAP appointment:', appointmentDate.toISOString())
        } else {
          appointmentDate = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`)
        }
        
        if (isNaN(appointmentDate.getTime())) {
          throw new Error("Invalid appointment date")
        }

        // Create temporary user immediately (no more NULL user_id!)
        console.log('🔄 Creating temporary user...')
        const tempUserId = await createTemporaryUser()
        console.log('✅ Got user ID:', tempUserId)
        
        // Note: Temporary users don't have auth credentials, so we proceed without authentication
        // The pick-mechanic page will handle access control based on appointment ID in URL
        console.log('✅ Temporary user created, proceeding without authentication (guest flow)')
        
        // Validate location data before creating appointment
        if (selectedLocation && selectedLocation.geometry) {
          console.log('✅ Using validated location data:', selectedLocation);
        } else {
          console.log('⚠️ No location coordinates available, proceeding with address only');
        }

        // Create appointment with real user_id (never NULL!)
        let appointmentData = {
          user_id: tempUserId, // ALWAYS has a user_id
          status: "pending",
          appointment_date: appointmentDate.toISOString(),
          location: formData.location,
          issue_description: formData.issueDescription,
          selected_services: formData.selectedServices,
          car_runs: formData.carRuns,
          source: 'web_guest_booking',
          // Add location coordinates if available
          ...(selectedLocation?.geometry && {
            latitude: selectedLocation.geometry.location.lat(),
            longitude: selectedLocation.geometry.location.lng(),
            place_id: selectedLocation.place_id || null
          })
        }

        let finalAppointmentId: string;

        if (appointmentId) {
          // EDIT MODE - Update existing appointment
          console.log('📝 UPDATING existing appointment:', appointmentId);
          
          // Check if appointment has quotes
          const { data: quotes } = await supabase
            .from('mechanic_quotes')
            .select('id')
            .eq('appointment_id', appointmentId)
            .eq('status', 'active');
          
          // Prepare update data
          const updateData: AppointmentUpdateData = {
            ...appointmentData,
            updated_at: new Date().toISOString(),
            is_being_edited: false
          };
          
          // If has quotes and significant changes, mark as edited
          if (quotes && quotes.length > 0) {
            updateData.edited_after_quotes = true;
            console.log('🔄 Marking appointment as edited after quotes');
          }
          
          // UPDATE the existing appointment
          const { error } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId);
            
          if (error) {
            throw error;
          }
          
          finalAppointmentId = appointmentId;
          
          // Navigate back to pick-mechanic page for edit mode
          console.log('🚀 Navigation starting - appointmentId:', finalAppointmentId)
          console.log('🚀 Navigating to:', `/pick-mechanic?appointment_id=${finalAppointmentId}`)
          
          // Save phone and email to sessionStorage when creating/updating appointment
          if (formData.phone) {
            sessionStorage.setItem('customer_phone', formData.phone);
          }
          if (formData.email) {
            sessionStorage.setItem('customer_email', formData.email);
          }
          
          // Clear sessionStorage since we're moving to the next step
          sessionStorage.removeItem('axle-landing-form-data')
          
          router.push(`/pick-mechanic?appointment_id=${finalAppointmentId}`)
          return;
        } else {
          // CREATE MODE - Create new appointment
          const { data: createdAppointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert(appointmentData)
            .select('id')
            .single()

          if (appointmentError) {
            throw appointmentError
          }

          if (!createdAppointment?.id) {
            throw new Error("Failed to create appointment")
          }

          finalAppointmentId = createdAppointment.id
        }

        // Handle vehicle data
        if (appointmentId) {
          // EDIT MODE - Update existing vehicle
          const vehicleData = {
            year: formData.year,
            make: formData.make,
            model: formData.model,
            mileage: parseInt(formData.mileage) || 0,
            vin: formData.vin || null
          }

          const { error: vehicleError } = await supabase
            .from('vehicles')
            .update(vehicleData)
            .eq('appointment_id', finalAppointmentId)

          if (vehicleError) {
            throw vehicleError
          }
        } else {
          // CREATE MODE - Create new vehicle
          const vehicleData = {
            appointment_id: finalAppointmentId, // Foreign key to appointment
            year: formData.year,
            make: formData.make,
            model: formData.model,
            mileage: parseInt(formData.mileage) || 0,
            vin: formData.vin || null
          }

          const { error: vehicleError } = await supabase
            .from('vehicles')
            .insert(vehicleData)

          if (vehicleError) {
            // If vehicle creation fails, clean up the appointment
            await supabase.from('appointments').delete().eq('id', finalAppointmentId)
            throw vehicleError
          }

          // Success - redirect to book appointment page for new appointments
          console.log('🚀 Navigation starting - appointmentId:', finalAppointmentId)
          console.log('🚀 Navigating to:', `/book-appointment?appointment_id=${finalAppointmentId}`)
          
          // Clear sessionStorage since we're moving to the next step
          sessionStorage.removeItem('axle-landing-form-data')
          
          router.push(`/book-appointment?appointment_id=${finalAppointmentId}`)
        }
        
      } catch (error: unknown) {
        console.log('❌ Error caught in handleSubmit:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        console.log('❌ Error message:', errorMessage)
        setErrors({ general: errorMessage })
      } finally {
        console.log('🔄 Finally block - setIsSubmitting(false)')
        setIsSubmitting(false)
      }
    } catch (outerError: unknown) {
      console.error('❌ UNCAUGHT ERROR in handleSubmit:', outerError)
      console.error('❌ Stack trace:', outerError instanceof Error ? outerError.stack : 'No stack trace')
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
      setIsSubmitting(false)
    }
  }, [formData, validateForm, router])

  // Check if all required fields are filled (for button state)
  const isFormComplete = React.useMemo((): boolean => {
    // Ensure all fields are strings before calling trim
    const location = typeof formData.location === 'string' ? formData.location : String(formData.location || '');
    const year = typeof formData.year === 'string' ? formData.year : String(formData.year || '');
    const make = typeof formData.make === 'string' ? formData.make : String(formData.make || '');
    const model = typeof formData.model === 'string' ? formData.model : String(formData.model || '');
    const appointmentDate = typeof formData.appointmentDate === 'string' ? formData.appointmentDate : String(formData.appointmentDate || '');
    const appointmentTime = typeof formData.appointmentTime === 'string' ? formData.appointmentTime : String(formData.appointmentTime || '');
    
    return !!(
      location.trim() &&
      year.trim() &&
      make.trim() &&
      model.trim() &&
      appointmentDate.trim() &&
      appointmentTime.trim()
    )
  }, [formData])

  // Get missing required fields for UX guidance
  const missingFields = React.useMemo((): string[] => {
    const missing: string[] = []
    // Ensure all fields are strings before calling trim
    const location = typeof formData.location === 'string' ? formData.location : String(formData.location || '');
    const year = typeof formData.year === 'string' ? formData.year : String(formData.year || '');
    const make = typeof formData.make === 'string' ? formData.make : String(formData.make || '');
    const model = typeof formData.model === 'string' ? formData.model : String(formData.model || '');
    const appointmentDate = typeof formData.appointmentDate === 'string' ? formData.appointmentDate : String(formData.appointmentDate || '');
    const appointmentTime = typeof formData.appointmentTime === 'string' ? formData.appointmentTime : String(formData.appointmentTime || '');
    
    if (!location.trim()) missing.push('location')
    if (!year.trim()) missing.push('year')
    if (!make.trim()) missing.push('make')
    if (!model.trim()) missing.push('model')
    if (!appointmentDate.trim()) missing.push('appointmentDate')
    if (!appointmentTime.trim()) missing.push('appointmentTime')
    return missing
  }, [formData])

  // Handle Continue button hover/click when disabled
  const handleDisabledContinueInteraction = React.useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      setShowMissingFields(true)
      
      // Simple red border for missing fields
      missingFields.forEach((fieldName) => {
        let targetElement: HTMLElement | null = null
        
        switch (fieldName) {
          case 'location':
            targetElement = document.querySelector('input[name="location"]')
            break
          case 'year':
            targetElement = document.querySelector('select[name="year"]')
            break
          case 'make':
            targetElement = document.querySelector('select[name="make"]')
            break
          case 'model':
            targetElement = document.querySelector('input[name="model"]')
            break
          case 'appointmentDate':
            targetElement = document.querySelector('input[type="date"]') || 
                           document.querySelector('[data-testid="date-selector"]')
            break
          case 'appointmentTime':
            targetElement = document.querySelector('.time-selector button') ||
                           document.querySelector('[data-testid="time-selector"]') ||
                           document.querySelector('select[aria-label*="time"]')
            break
        }
        
        if (targetElement) {
          targetElement.style.borderColor = '#ef4444'
        }
      })
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowMissingFields(false)
        // Remove red borders
        missingFields.forEach((fieldName) => {
          let targetElement: HTMLElement | null = null
          
          switch (fieldName) {
            case 'location':
              targetElement = document.querySelector('input[name="location"]')
              break
            case 'year':
              targetElement = document.querySelector('select[name="year"]')
              break
            case 'make':
              targetElement = document.querySelector('select[name="make"]')
              break
            case 'model':
              targetElement = document.querySelector('input[name="model"]')
              break
            case 'appointmentDate':
              targetElement = document.querySelector('input[type="date"]') || 
                             document.querySelector('[data-testid="date-selector"]')
              break
            case 'appointmentTime':
              targetElement = document.querySelector('.time-selector button') ||
                             document.querySelector('[data-testid="time-selector"]') ||
                             document.querySelector('select[aria-label*="time"]')
              break
          }
          
          if (targetElement) {
            targetElement.style.borderColor = ''
          }
        })
      }, 3000)
    }
  }, [isFormComplete, isSubmitting, missingFields])

  const handleDateTimeChange = React.useCallback((date: Date, time: string): void => {
    // This function is only called when BOTH date AND time are properly selected
    // (thanks to our DateTimeSelector improvement)
    
    // Convert the selected date and time to the format expected by the form
    const formattedDate = date.toISOString().split("T")[0]

    // Process the time selection
    let formattedTime: string = ""
    
    if (time && time !== "Select time" && time !== "") {
      if (time === "ASAP") {
        // Keep "ASAP" as the value for validation and processing
        formattedTime = "ASAP"
      } else {
        // Parse the time string (e.g., "9:30 AM") to 24-hour format
        const [timePart, ampm] = time.split(" ")
        let [hours, minutes] = timePart.split(":").map(Number)

        if (ampm === "PM" && hours < 12) hours += 12
        if (ampm === "AM" && hours === 12) hours = 0

        formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      }
    }

    // Update form data - this will NOT trigger form submission, only state update
    setFormData((prev: AppointmentFormData) => ({
      ...prev,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
    }))
  }, [])

  // Add handleLocationSelect function with useCallback to prevent infinite loops
  const handleLocationSelect = useCallback((place: google.maps.places.PlaceResult) => {
    // Add null checks and validation
    if (!place || !place.geometry) {
      console.error('Invalid place data received:', place);
      return;
    }

    if (typeof place.geometry.location.lat !== 'number' || typeof place.geometry.location.lng !== 'number') {
      console.error('Invalid coordinates received:', place.geometry.location);
      return;
    }

    setSelectedLocation(place);
    setFormData((prev) => ({
      ...prev,
      location: place.formatted_address || "",
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      place_id: place.place_id || '',
    }));
  }, []); // Empty deps array to prevent re-creation

  // Add handleLocationChange function with useCallback to prevent infinite loops
  const handleLocationChange = useCallback((val: string | React.ChangeEvent<HTMLInputElement>) => {
    const value = typeof val === 'string' ? val : val.target.value;
    setFormData(f => ({ ...f, location: value }));
  }, []); // Empty deps array to prevent re-creation

  // Memoized event handlers to prevent infinite loops
  const handleTimeSelected = useCallback(() => {
    // After time is selected, focus the continue button
    setTimeout(() => {
      continueButtonRef.current?.focus()
    }, 100)
  }, []);

  const handleWrapperMouseEnter = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperMouseDown = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperClick = useCallback((e: React.MouseEvent) => {
    if (!isFormComplete && !isSubmitting) {
      e.preventDefault()
      e.stopPropagation()
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperTouchStart = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isFormComplete && !isSubmitting) {
        handleDisabledContinueInteraction()
      }
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    if (!isFormComplete && !isSubmitting) {
      e.preventDefault()
      e.stopPropagation()
      handleDisabledContinueInteraction()
    }
    console.log('🔘 Continue button onClick triggered - isSubmitting:', isSubmitting, 'isFormComplete:', isFormComplete)
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  // Show loading state while restoring data
  if (isLoadingExistingData) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
            <p className="text-gray-600">Restoring your information...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Title Section */}
          <h1 className="text-3xl font-bold text-center text-[#294a46] mb-2">Find Your Mechanic</h1>
          <div className="text-center mb-6">
            <p className="text-gray-600">Bring a Mechanic to your Location</p>
            <p className="text-gray-600">Order a Service</p>
            {appointmentId && (
              <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                ✨ Editing existing appointment
              </div>
            )}
          </div>

          <div className="mb-8 space-y-6">
            {/* Location Label */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Enter your location
              </label>
            </div>

            {/* Location Input */}
            <div className="relative location-input-wrapper">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Type your address here..."
                className="w-full h-[50px] pl-10 pr-4 text-base border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46] transition-all duration-200"
                autoFocus
                ref={locationInputRef}
              />
            </div>

            {/* Spacer for autocomplete dropdown */}
            <div className="h-[200px]"></div>

            {/* Map Container */}
            <div className="w-full h-[400px] rounded-lg border border-gray-200 overflow-hidden">
              <div ref={mapRef} className="w-full h-full bg-gray-100">
                {!mapLoaded && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Car Selector */}
            <div className="mb-4 w-full">

              {/* Desktop layout: All fields in one row */}
              <div className="hidden sm:flex gap-2">
                <div className="relative w-[8ch]">

                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.year 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Year</option>
                    {(() => {
                      const currentYear = new Date().getFullYear()
                      const currentMonth = new Date().getMonth() // 0-11, where 8 = September
                      const maxYear = currentMonth >= 8 ? currentYear + 2 : currentYear + 1 // Add extra year if September or later
                      const years = []
                      
                      for (let year = maxYear; year >= currentYear - 29; year--) {
                        years.push(year)
                      }
                      
                      return years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    })()}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.year && <p className="text-red-500 text-xs absolute -bottom-5">{errors.year}</p>}
                </div>

                <div className="relative w-[20%]">

                  <select
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.make 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Make</option>
                    {makes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.make && <p className="text-red-500 text-xs absolute -bottom-5">{errors.make}</p>}
                </div>

                <div className="relative w-[20%]">

                  <input
                    ref={modelRef}
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Model"
                    className={`w-full h-[46px] px-2 text-sm border rounded-md bg-gray-50 transition-all duration-300 ${
                      errors.model 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  />
                  {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
                </div>

                <div className="relative w-[30%]">
                  <input
                    ref={vinRef}
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="VIN (optional)"
                    className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  />
                </div>

                <div className="relative w-[15%]">
                  <input
                    ref={mileageRef}
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Mileage"
                    className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              {/* Mobile layout: Two rows */}
              <div className="sm:hidden">
                {/* First row: Year, Make, Model */}
                <div className="flex gap-2 mb-2">
                  <div className="relative w-[8ch]">
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                        errors.year 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">Year</option>
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const currentMonth = new Date().getMonth() // 0-11, where 8 = September
                        const maxYear = currentMonth >= 8 ? currentYear + 2 : currentYear + 1 // Add extra year if September or later
                        const years = []
                        
                        for (let year = maxYear; year >= currentYear - 29; year--) {
                          years.push(year)
                        }
                        
                        return years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))
                      })()}
                    </select>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.year && <p className="text-red-500 text-xs absolute -bottom-5">{errors.year}</p>}
                  </div>

                  <div className="relative flex-1">
                    <select
                      name="make"
                      value={formData.make}
                      onChange={handleChange}
                      className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                        errors.make 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">Make</option>
                      {makes.map((make) => (
                        <option key={make} value={make}>
                          {make}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.make && <p className="text-red-500 text-xs absolute -bottom-5">{errors.make}</p>}
                  </div>

                  <div className="relative flex-1">
                    <input
                      ref={modelRef}
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Model"
                      className={`w-full h-[46px] px-2 text-sm border rounded-md bg-gray-50 transition-all duration-300 ${
                        errors.model 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                    />
                    {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
                  </div>
                </div>

                {/* Second row: VIN and Mileage */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={vinRef}
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="VIN (optional)"
                      className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                    />
                  </div>

                  <div className="relative w-[120px]">
                    <input
                      ref={mileageRef}
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Mileage"
                      className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Time Selector */}
            <div className="mb-6 rounded-lg transition-all duration-300">
              <DateTimeSelector
                ref={dateTimeSelectorRef}
                onDateTimeChange={handleDateTimeChange}
                onTimeSelected={handleTimeSelected}
              />
            </div>

            {/* Continue Button */}
            <div className="flex justify-center mb-8">
              <div 
                className="relative inline-block"
                onMouseEnter={handleWrapperMouseEnter}
                onMouseDown={handleWrapperMouseDown}
                onClick={handleWrapperClick}
                onTouchStart={handleWrapperTouchStart}
                role="button"
                tabIndex={0}
                aria-label={!isFormComplete ? `Continue button wrapper - ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} missing` : "Continue to next step"}
                onKeyDown={handleWrapperKeyDown}
              >
                <Button
                  ref={continueButtonRef}
                  type="submit"
                  disabled={isSubmitting || !isFormComplete}
                  className={`font-medium py-6 px-10 rounded-full transform transition-all duration-200 relative focus:outline-none focus:ring-0 hover:outline-none active:outline-none ${
                    isFormComplete && !isSubmitting 
                      ? "bg-[#294a46] hover:bg-[#1e3632] text-white hover:scale-[1.01] active:scale-[0.99]" 
                      : "bg-[#294a46]/40 text-white cursor-pointer hover:bg-[#294a46]/60 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                  onClick={handleButtonClick}
                  // Enhanced accessibility attributes
                  aria-label={!isFormComplete ? `Continue button - ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} missing` : "Continue to next step"}
                  aria-describedby={!isFormComplete ? "missing-fields-help" : undefined}
                  aria-disabled={!isFormComplete || isSubmitting}
                  title={!isFormComplete ? `Complete ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} to continue` : "Continue to book your appointment"}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : !(typeof formData.appointmentTime === 'string' ? formData.appointmentTime : String(formData.appointmentTime || '')).trim() ? (
                    <span>Please select a time</span>
                  ) : !(typeof formData.location === 'string' ? formData.location : String(formData.location || '')).trim() ? (
                    <span>Please enter location</span>
                  ) : !(typeof formData.year === 'string' ? formData.year : String(formData.year || '')).trim() ? (
                    <span>Please select year</span>
                  ) : !(typeof formData.make === 'string' ? formData.make : String(formData.make || '')).trim() ? (
                    <span>Please select make</span>
                  ) : !(typeof formData.model === 'string' ? formData.model : String(formData.model || '')).trim() ? (
                    <span>Please enter model</span>
                  ) : !(typeof formData.appointmentDate === 'string' ? formData.appointmentDate : String(formData.appointmentDate || '')).trim() ? (
                    <span>Please select date</span>
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
                

              </div>
            </div>



            
            {/* Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
                <h3 className="text-sm font-semibold mb-1">Error</h3>
                <p className="text-sm">{errors.general}</p>
                {errors.general.includes('migration') && (
                  <div className="mt-2 text-xs text-red-600">
                    <p>Please run the database migration first:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to Supabase Dashboard → SQL Editor</li>
                      <li>Run migrations/implement_always_create_user_system.sql</li>
                      <li>Try again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Description */}
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            We onboard trusted mobile mechanics who run their own businesses and have a proven track record, with Google
            or Yelp reviews of 4 stars or higher.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#294a46] flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-[#294a46]" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600 mb-2">Track mechanic in real-time and get accurate ETA.</p>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-28 h-28 flex items-center justify-center mb-2">
                <div className="w-20 h-20 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-gray-500 inline-flex items-center justify-center">📅</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Book Appointments Online</h3>
              <p className="text-gray-600">
                Schedule repair or maintenance services at a time and date that works for you.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${i < 4 ? "text-[#294a46] fill-current" : "text-[#294a46] fill-none"}`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-.181h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ratings and Reviews</h3>
              <p className="text-gray-600 mb-2">Read and write reviews for mechanics to ensure quality service.</p>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Options Section */}
      <section className="bg-[#294a46] text-white py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Register Car */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">🚗</span>
              <h3 className="text-xl font-bold mb-2">Register your Car</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Find trusted mechanics</p>
                <p className="text-sm">Schedule and track repairs</p>
                <p className="text-sm">Rate and Review Services</p>
              </div>
              <Link href="/signup" className="text-sm flex items-center gap-1 text-white hover:underline">
                Get Started <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Register Mechanic */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">⚙️</span>
              <h3 className="text-xl font-medium mb-2">Register Mobile Mechanic</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Get job requests</p>
                <p className="text-sm">Manage your Schedule</p>
                <p className="text-sm">Showcase your skills</p>
              </div>
              <Link href="/signup" className="text-sm flex items-center gap-1 text-white hover:underline">
                Get Started <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Register Shop */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">🏪</span>
              <h3 className="text-xl font-medium mb-2">Register your Shop</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Custom pricing and quotes</p>
                <p className="text-sm">Customer Reviews and Ratings</p>
                <p className="text-sm">Promote your Services</p>
              </div>
              <span className="text-sm text-gray-300">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Remove all outline and glow effects from continue button */
        button[type="submit"] {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        button[type="submit"]:hover,
        button[type="submit"]:focus,
        button[type="submit"]:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Screen reader only class */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Custom tooltip animations */
        .tooltip-enter {
          opacity: 0;
          transform: translateY(-5px) translateX(-50%);
        }
        
        .tooltip-enter-active {
          opacity: 1;
          transform: translateY(0) translateX(-50%);
          transition: all 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

// Loading fallback component
function HomePageLoading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Main export with Suspense wrapper
export default function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  )
}
