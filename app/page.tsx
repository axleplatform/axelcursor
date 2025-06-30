"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react'
import { useRouter } from "next/navigation"
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
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

  // Add refs for progressive navigation
  const modelRef = useRef<HTMLInputElement>(null)
  const vinRef = useRef<HTMLInputElement>(null)
  const mileageRef = useRef<HTMLInputElement>(null)
  const dateTimeSelectorRef = useRef<{ openDateDropdown: () => void; openTimeDropdown: () => void; isFormComplete: () => boolean } | null>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

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

    // Validate appointment date is not in the past
    if (formData.appointmentDate && formData.appointmentTime) {
      try {
        console.log('🔄 validateForm: Parsing date:', `${formData.appointmentDate}T${formData.appointmentTime}`)
        const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`)
        console.log('🔄 validateForm: Parsed date:', appointmentDateTime)
        
        if (isNaN(appointmentDateTime.getTime())) {
          console.log('❌ validateForm: Invalid date format')
          newErrors.appointmentDate = "Invalid date or time format"
        } else {
          const now = new Date()
          console.log('🔄 validateForm: Comparing dates - appointment:', appointmentDateTime, 'now:', now)
          
          if (appointmentDateTime <= now) {
            console.log('❌ validateForm: Date is in the past')
            newErrors.appointmentDate = "Appointment must be in the future"
          }
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
        const appointmentDate = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`)
        
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

  const handleDateTimeChange = React.useCallback((date: Date, time: string): void => {
    // This function is only called when BOTH date AND time are properly selected
    // (thanks to our DateTimeSelector improvement)
    
    // Convert the selected date and time to the format expected by the form
    const formattedDate = date.toISOString().split("T")[0]

    // Process the time selection
    let formattedTime: string = ""
    
    if (time && time !== "Select time" && time !== "") {
      if (time === "Now") {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, "0")
        const minutes = now.getMinutes().toString().padStart(2, "0")
        formattedTime = `${hours}:${minutes}`
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
                  className={`block w-full p-4 pl-10 pr-16 text-sm text-gray-900 border ${errors.address ? "border-red-500" : "border-gray-300"} rounded-lg bg-white relative z-10`}
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
                  className={`w-full h-[46px] px-2 pr-6 text-sm border ${errors.year ? "border-red-500" : "border-gray-200"} rounded-md bg-gray-50 appearance-none`}
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
                  className={`w-full h-[46px] px-2 pr-6 text-sm border ${errors.make ? "border-red-500" : "border-gray-200"} rounded-md bg-gray-50 appearance-none`}
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
                  className={`w-full h-[46px] px-2 text-sm border ${errors.model ? "border-red-500" : "border-gray-200"} rounded-md bg-gray-50`}
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
            <div className="mb-6">
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
              <Button
                ref={continueButtonRef}
                type="submit"
                disabled={isSubmitting || !isFormComplete}
                className={`font-medium py-6 px-10 rounded-full transform transition-all duration-200 ${
                  isFormComplete && !isSubmitting 
                    ? "bg-[#294a46] hover:bg-[#1e3632] text-white hover:scale-[1.01] hover:shadow-md active:scale-[0.99]" 
                    : "bg-[#294a46]/40 text-white cursor-not-allowed"
                }`}
                onClick={() => console.log('🔘 Continue button onClick triggered - isSubmitting:', isSubmitting, 'isFormComplete:', isFormComplete)}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
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

      {/* Custom styles for date and time inputs */}
      <style jsx global>{`
        /* Date input styling */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(15%) sepia(19%) saturate(755%) hue-rotate(118deg) brightness(95%) contrast(91%);
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="time"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        input[type="date"],
        input[type="time"] {
          font-family: inherit;
          color: #333;
        }

        input[type="date"]:focus,
        input[type="time"]:focus {
          color: #294a46;
          outline: none;
        }

        /* Remove default styling for Firefox */
        input[type="date"]::-moz-calendar-picker-indicator,
        input[type="time"]::-moz-calendar-picker-indicator {
          background: transparent;
        }

        /* Custom styling for the calendar popup */
        ::-webkit-datetime-edit {
          padding: 0;
        }

        ::-webkit-datetime-edit-fields-wrapper {
          background: transparent;
        }

        ::-webkit-datetime-edit-text {
          color: #294a46;
          padding: 0 0.2em;
        }

        ::-webkit-datetime-edit-month-field,
        ::-webkit-datetime-edit-day-field,
        ::-webkit-datetime-edit-year-field,
        ::-webkit-datetime-edit-hour-field,
        ::-webkit-datetime-edit-minute-field,
        ::-webkit-datetime-edit-ampm-field {
          color: #333;
        }

        ::-webkit-datetime-edit-month-field:focus,
        ::-webkit-datetime-edit-day-field:focus,
        ::-webkit-datetime-edit-year-field:focus,
        ::-webkit-datetime-edit-hour-field:focus,
        ::-webkit-datetime-edit-minute-field:focus,
        ::-webkit-datetime-edit-ampm-field:focus {
          color: #294a46;
          background-color: rgba(41, 74, 70, 0.05);
        }

        /* Improve the appearance on focus */
        .date-input:focus,
        .time-input:focus {
          color: #294a46;
        }

        /* Ensure consistent height */
        .date-input,
        .time-input {
          height: 24px;
        }


      `}</style>
    </div>
  )
}
