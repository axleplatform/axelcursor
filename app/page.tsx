"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { MapPin, ChevronRight, User } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { DateTimeSelector } from "@/components/date-time-selector"
import { toast } from "@/components/ui/use-toast"

// Define types for form data
interface AppointmentFormData {
  address: string
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
}

interface SupabaseQueryResult {
  data: unknown
  error: unknown
}

export default function HomePage(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isLoadingExistingData, setIsLoadingExistingData] = useState<boolean>(false)
  const [errors, setErrors] = useState<Partial<AppointmentFormData & { general?: string }>>({})
  const [formData, setFormData] = useState<AppointmentFormData>({
    address: "",
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
          address: data.location || "",
          vin: data.vehicles?.vin || "",
          year: data.vehicles?.year?.toString() || "",
          make: data.vehicles?.make || "",
          model: data.vehicles?.model || "",
          mileage: data.vehicles?.mileage?.toString() || "",
          appointmentDate: data.appointment_date ? data.appointment_date.split('T')[0] : "",
          appointmentTime: data.appointment_date ? data.appointment_date.split('T')[1]?.substring(0, 5) : "",
          issueDescription: data.issue_description || "",
          selectedServices: data.selected_services || [],
          carRuns: data.car_runs
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
  useEffect(() => {
    if (appointmentId) {
      loadExistingAppointment()
    } else {
      // Try to restore from sessionStorage as fallback
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
    }
  }, [appointmentId, loadExistingAppointment])

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    if (formData.address || formData.year || formData.make || formData.model) {
      sessionStorage.setItem('axle-landing-form-data', JSON.stringify(formData))
    }
  }, [formData])

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
    "Toyota",
    "Honda",
    "Ford",
    "Chevrolet",
    "BMW",
    "Mercedes",
    "Audi",
    "Nissan",
    "Acura",
    "Buick",
    "Cadillac",
    "Chrysler",
    "Dodge",
    "GMC",
    "Hyundai",
    "Infiniti",
    "Jaguar",
    "Jeep",
    "Kia",
    "Land Rover",
    "Lexus",
    "Lincoln",
    "Mazda",
    "Mercury",
    "Mitsubishi",
    "Pontiac",
    "Porsche",
    "Ram",
    "Subaru",
    "Tesla",
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

    if (!formData.address.trim()) {
      newErrors.address = "Address is required"
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

  // Handle form submission
  const handleSubmit = React.useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    try {
      console.log('🔵 Continue button clicked - handleSubmit called')
      e.preventDefault()
      console.log('✅ preventDefault() completed')
      
      console.log('🔍 About to log Form data')
      console.log('🔍 Form data:', formData)
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
        
        // Create appointment with real user_id (never NULL!)
        const initialAppointmentData = {
          user_id: tempUserId, // ALWAYS has a user_id
          status: "pending",
          appointment_date: appointmentDate.toISOString(),
          location: formData.address,
          issue_description: formData.issueDescription,
          selected_services: formData.selectedServices,
          car_runs: formData.carRuns,
          source: 'web_guest_booking'
        }

        const { data: createdAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            user_id: tempUserId, // ALWAYS has a user_id
            status: "pending",
            appointment_date: appointmentDate.toISOString(),
            location: formData.address,
            issue_description: formData.issueDescription,
            selected_services: formData.selectedServices,
            car_runs: formData.carRuns,
            source: 'web_guest_booking'
          })
          .select('id')
          .single()

        if (appointmentError) {
          throw appointmentError
        }

        if (!createdAppointment?.id) {
          throw new Error("Failed to create appointment")
        }

        const appointmentId = createdAppointment.id

        // Create vehicle with foreign key
        const vehicleData = {
          appointment_id: appointmentId, // Foreign key to appointment
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
          await supabase.from('appointments').delete().eq('id', appointmentId)
          throw vehicleError
        }

        // Success - redirect to book appointment page
        console.log('🚀 Navigation starting - appointmentId:', appointmentId)
        console.log('🚀 Navigating to:', `/book-appointment?appointment_id=${appointmentId}`)
        
        // Clear sessionStorage since we're moving to the next step
        sessionStorage.removeItem('axle-landing-form-data')
        
        router.push(`/book-appointment?appointment_id=${appointmentId}`)
        
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
    return !!(
      formData.address.trim() &&
      formData.year.trim() &&
      formData.make.trim() &&
      formData.model.trim() &&
      formData.appointmentDate.trim() &&
      formData.appointmentTime.trim()
    )
  }, [formData])

  // Get missing required fields for UX guidance
  const missingFields = React.useMemo((): string[] => {
    const missing: string[] = []
    if (!formData.address.trim()) missing.push('address')
    if (!formData.year.trim()) missing.push('year')
    if (!formData.make.trim()) missing.push('make')
    if (!formData.model.trim()) missing.push('model')
    if (!formData.appointmentDate.trim()) missing.push('appointmentDate')
    if (!formData.appointmentTime.trim()) missing.push('appointmentTime')
    return missing
  }, [formData])

  // Handle Continue button hover/click when disabled
  const handleDisabledContinueInteraction = React.useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      setShowMissingFields(true)
      
      // Enhanced visual feedback for all missing fields with improved targeting
      missingFields.forEach((fieldName, index) => {
        setTimeout(() => {
          let targetElement: HTMLElement | null = null
          let parentContainer: HTMLElement | null = null
          
          switch (fieldName) {
            case 'address':
              targetElement = document.querySelector('input[name="address"]') ||
                             document.querySelector('input[placeholder*="address"], input[placeholder*="Address"]')
              break
            case 'year':
              targetElement = document.querySelector('select[name="year"]') ||
                             document.querySelector('select[aria-label*="year"], select[aria-label*="Year"]')
              break
            case 'make':
              targetElement = document.querySelector('select[name="make"]') ||
                             document.querySelector('select[aria-label*="make"], select[aria-label*="Make"]')
              break
            case 'model':
              targetElement = document.querySelector('input[name="model"]') ||
                             document.querySelector('input[placeholder*="model"], input[placeholder*="Model"]')
              break
            case 'appointmentDate':
              // Target the date selector specifically with multiple fallbacks
              targetElement = document.querySelector('input[type="date"]') || 
                             document.querySelector('[data-testid="date-selector"]') ||
                             document.querySelector('.date-selector') ||
                             document.querySelector('input[aria-label*="date"], input[aria-label*="Date"]')
              // Also target the parent container for better visibility
              parentContainer = document.querySelector('.date-time-selector') ||
                               document.querySelector('[class*="DateTimeSelector"]') ||
                               document.querySelector('[class*="date-time"]')
              break
            case 'appointmentTime':
              // Target the time selector specifically with multiple fallbacks
              targetElement = document.querySelector('[data-testid="time-selector"]') ||
                             document.querySelector('.time-selector') ||
                             document.querySelector('select[aria-label*="time"], select[aria-label*="Time"]') ||
                             document.querySelector('input[type="time"]')
              // Also target the parent container for better visibility
              parentContainer = document.querySelector('.date-time-selector') ||
                               document.querySelector('[class*="DateTimeSelector"]') ||
                               document.querySelector('[class*="date-time"]')
              break
          }
          
          if (targetElement || parentContainer) {
            const elementToHighlight = targetElement || parentContainer
            
            if (elementToHighlight) {
              // Enhanced highlighting animation with more visual impact
              elementToHighlight.style.transition = 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'
              elementToHighlight.style.transform = 'scale(1.05)'
              elementToHighlight.style.boxShadow = '0 0 0 6px rgba(239, 68, 68, 0.8), 0 0 25px rgba(239, 68, 68, 0.4)'
              elementToHighlight.style.borderColor = '#ef4444'
              elementToHighlight.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
              elementToHighlight.style.zIndex = '10'
              
              // Add ARIA live region announcement for screen readers
              const announcement = document.createElement('div')
              announcement.setAttribute('aria-live', 'polite')
              announcement.setAttribute('aria-atomic', 'true')
              announcement.className = 'sr-only'
              announcement.textContent = `Required field missing: ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}`
              document.body.appendChild(announcement)
              
              // Add a shake animation for extra attention
              elementToHighlight.style.animation = 'shake 0.5s ease-in-out, pulse 2s ease-in-out infinite'
              
              // Reset styles after animation
              setTimeout(() => {
                if (elementToHighlight) {
                  elementToHighlight.style.transform = ''
                  elementToHighlight.style.boxShadow = ''
                  elementToHighlight.style.animation = ''
                  elementToHighlight.style.borderColor = ''
                  elementToHighlight.style.backgroundColor = ''
                  elementToHighlight.style.zIndex = ''
                  elementToHighlight.style.transition = ''
                }
                // Remove the announcement element
                if (announcement && announcement.parentNode) {
                  announcement.parentNode.removeChild(announcement)
                }
              }, 3000)
            }
          }
        }, index * 200) // Slightly increased stagger for better effect
      })
      
      // Enhanced scrolling and focusing to the first missing field
      const firstMissingField = missingFields[0]
      if (firstMissingField) {
        setTimeout(() => {
          let targetElement: HTMLElement | null = null
          let shouldScroll = true
          
          switch (firstMissingField) {
            case 'address':
              targetElement = document.querySelector('input[name="address"]')
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
                             document.querySelector('[data-testid="date-selector"]') ||
                             document.querySelector('.date-selector') ||
                             document.querySelector('.date-time-selector')
              break
            case 'appointmentTime':
              targetElement = document.querySelector('[data-testid="time-selector"]') ||
                             document.querySelector('.time-selector') ||
                             document.querySelector('select[aria-label*="time"], select[aria-label*="Time"]') ||
                             document.querySelector('.date-time-selector')
              break
          }
          
          if (targetElement && shouldScroll) {
            // Enhanced smooth scroll with better positioning
            const elementRect = targetElement.getBoundingClientRect()
            const offset = 120 // Increased offset for better visibility
            const targetPosition = window.pageYOffset + elementRect.top - offset
            
            // Ensure we don't scroll past the top of the page
            const finalPosition = Math.max(0, targetPosition)
            
            window.scrollTo({
              top: finalPosition,
              behavior: 'smooth'
            })
            
            // Enhanced focus logic with better element detection
            setTimeout(() => {
              if (targetElement) {
                // Check if element is focusable
                if ('focus' in targetElement && typeof targetElement.focus === 'function') {
                  try {
                    (targetElement as HTMLInputElement | HTMLSelectElement).focus()
                    
                    // Add a subtle focus ring for extra visibility
                    targetElement.style.outline = '2px solid #3b82f6'
                    targetElement.style.outlineOffset = '2px'
                    
                    // Remove focus ring after a delay
                    setTimeout(() => {
                      if (targetElement) {
                        targetElement.style.outline = ''
                        targetElement.style.outlineOffset = ''
                      }
                    }, 2000)
                  } catch (focusError) {
                    console.warn('Focus failed:', focusError)
                  }
                }
                
                // For non-focusable elements, ensure they're visible
                const isInViewport = elementRect.top >= 0 && elementRect.bottom <= window.innerHeight
                if (!isInViewport) {
                  targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  })
                }
              }
            }, 600)
          }
        }, 300) // Small delay to let the highlighting animation start first
      }
      
      // Enhanced auto-hide with user interaction detection
      const hideTimeout = setTimeout(() => setShowMissingFields(false), 8000) // Increased to 8 seconds
      
      // Clear timeout if user starts interacting with form
      const clearTimeoutOnInteraction = () => {
        clearTimeout(hideTimeout)
        document.removeEventListener('keydown', clearTimeoutOnInteraction)
        document.removeEventListener('click', clearTimeoutOnInteraction)
      }
      
      document.addEventListener('keydown', clearTimeoutOnInteraction, { once: true })
      document.addEventListener('click', clearTimeoutOnInteraction, { once: true })
      
      // Announce to screen readers
      const globalAnnouncement = document.createElement('div')
      globalAnnouncement.setAttribute('aria-live', 'assertive')
      globalAnnouncement.setAttribute('aria-atomic', 'true')
      globalAnnouncement.className = 'sr-only'
      globalAnnouncement.textContent = `Please complete ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} to continue. Highlighted fields need your attention.`
      document.body.appendChild(globalAnnouncement)
      
      setTimeout(() => {
        if (globalAnnouncement && globalAnnouncement.parentNode) {
          globalAnnouncement.parentNode.removeChild(globalAnnouncement)
        }
      }, 5000)
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

          <form onSubmit={handleSubmit}>
            {/* Location Input */}
            <div className="mb-3">
              <h2 className="text-lg font-medium mb-1">Enter your location</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-20">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter complete address (123 Main St, City, State)"
                  className={`block w-full p-4 pl-10 pr-16 text-sm text-gray-900 border rounded-lg bg-white relative z-10 transition-all duration-300 ${
                    errors.address 
                      ? "border-red-500" 
                      : showMissingFields && missingFields.includes('address')
                        ? "border-amber-400 bg-amber-50 animate-pulse"
                        : "border-gray-300"
                  }`}
                />
              </div>
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              <div className="flex items-center justify-between text-xs mt-1">
                <p className="text-gray-500">Or drag the pin on the map to set your exact location</p>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mb-4 h-[220px] bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-gray-500 flex flex-col items-center">
                <MapPin className="h-10 w-10 mb-2" />
                <span>Map View</span>
              </div>
            </div>

            {/* Car Selector */}
            <div className="flex gap-2 mb-4 w-full">
              <div className="relative w-[8ch]">
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                    errors.year 
                      ? "border-red-500" 
                      : showMissingFields && missingFields.includes('year')
                        ? "border-amber-400 bg-amber-50 animate-pulse"
                        : "border-gray-200"
                  }`}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
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
                      : showMissingFields && missingFields.includes('make')
                        ? "border-amber-400 bg-amber-50 animate-pulse"
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
                      : showMissingFields && missingFields.includes('model')
                        ? "border-amber-400 bg-amber-50 animate-pulse"
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

            {/* Date Time Selector */}
            <div className={`mb-6 rounded-lg transition-all duration-300 ${
              showMissingFields && (missingFields.includes('appointmentDate') || missingFields.includes('appointmentTime'))
                ? 'border-2 border-amber-400 bg-amber-50 p-3 animate-pulse'
                : ''
            }`}>
              <DateTimeSelector
                ref={dateTimeSelectorRef}
                onDateTimeChange={handleDateTimeChange}
                onTimeSelected={() => {
                  // After time is selected, focus the continue button
                  setTimeout(() => {
                    continueButtonRef.current?.focus()
                  }, 100)
                }}
              />
            </div>

            {/* Continue Button */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Button
                  ref={continueButtonRef}
                  type="submit"
                  disabled={isSubmitting || !isFormComplete}
                  className={`font-medium py-6 px-10 rounded-full transform transition-all duration-200 relative ${
                    isFormComplete && !isSubmitting 
                      ? "bg-[#294a46] hover:bg-[#1e3632] text-white hover:scale-[1.01] hover:shadow-md active:scale-[0.99]" 
                      : "bg-[#294a46]/40 text-white cursor-pointer hover:bg-[#294a46]/60 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                  onClick={(e) => {
                    if (!isFormComplete && !isSubmitting) {
                      e.preventDefault()
                      handleDisabledContinueInteraction()
                    }
                    console.log('🔘 Continue button onClick triggered - isSubmitting:', isSubmitting, 'isFormComplete:', isFormComplete)
                  }}
                  onMouseEnter={() => {
                    if (!isFormComplete && !isSubmitting) {
                      handleDisabledContinueInteraction()
                    }
                  }}
                  onMouseDown={() => {
                    if (!isFormComplete && !isSubmitting) {
                      handleDisabledContinueInteraction()
                    }
                  }}
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
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
                
                {/* Enhanced Tooltip for Disabled State */}
                {!isFormComplete && !isSubmitting && showMissingFields && (
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-20 animate-slideIn">
                    <div className="bg-gray-900 text-white text-sm py-2 px-4 rounded-lg shadow-lg whitespace-nowrap">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        Complete {missingFields.length} required field{missingFields.length > 1 ? 's' : ''}
                      </div>
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden accessibility helper */}
            <div id="missing-fields-help" className="sr-only" aria-live="polite">
              {!isFormComplete && `Required fields: ${missingFields.map(field => field.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}`}
            </div>

            {/* Enhanced Missing Fields Indicator */}
            {showMissingFields && !isFormComplete && (
              <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-lg animate-slideIn">
                <div className="flex items-start mb-3">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-amber-900 font-semibold text-base mb-1">Complete Required Fields</h3>
                    <p className="text-amber-700 text-sm mb-3">Please fill out the following information to continue:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {missingFields.includes('address') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          📍 Enter your location
                        </div>
                      )}
                      {missingFields.includes('year') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          🗓️ Select vehicle year
                        </div>
                      )}
                      {missingFields.includes('make') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          🚗 Select vehicle make
                        </div>
                      )}
                      {missingFields.includes('model') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          🔧 Enter vehicle model
                        </div>
                      )}
                      {missingFields.includes('appointmentDate') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          📅 Choose appointment date
                        </div>
                      )}
                      {missingFields.includes('appointmentTime') && (
                        <div className="flex items-center text-sm text-amber-800 bg-white/50 px-3 py-1.5 rounded-md">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                          ⏰ Select appointment time
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-600 text-center mt-3 font-medium">
                  💡 This guide will automatically disappear in a few seconds
                </div>
              </div>
            )}

            
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
                  <span className="text-xl sm:text-2xl lg:text-3xl leading-none text-gray-500 inline-flex items-center justify-center">📅</span>
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
              <User className="h-10 w-10 mb-4" />
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
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">🏠</span>
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
        
        @keyframes glow {
          0% { box-shadow: 0 0 0 #ff4d4f; }
          50% { box-shadow: 0 0 8px #ff4d4f; }
          100% { box-shadow: 0 0 0 #ff4d4f; }
        }
        
        @keyframes gentleGlow {
          0%, 100% { 
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% { 
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.8), 0 0 25px rgba(59, 130, 246, 0.5);
          }
        }
        
        @keyframes focusRing {
          0% { 
            outline-offset: 2px;
            outline-color: rgba(59, 130, 246, 0.8);
          }
          50% { 
            outline-offset: 4px;
            outline-color: rgba(59, 130, 246, 0.6);
          }
          100% { 
            outline-offset: 2px;
            outline-color: rgba(59, 130, 246, 0.8);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-gentleGlow {
          animation: gentleGlow 2s ease-in-out infinite;
        }
        
        .animate-focusRing {
          animation: focusRing 2s ease-in-out infinite;
        }
        
        .missing-field {
          animation: shake 0.5s, glow 0.5s;
          border: 2px solid #ff4d4f !important;
          box-shadow: 0 0 8px #ff4d4f !important;
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
        
        /* Enhanced accessibility for focus states */
        .enhanced-focus:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
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
