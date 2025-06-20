"use client"

import type React from "react"

import { useState, useCallback, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, Calendar, ChevronRight, User, Settings, Home } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
// Import the DateTimeSelector component
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
}

export default function HomePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<AppointmentFormData>>({})
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

  // Add debug logging
  useEffect(() => {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("Supabase Anon Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Test Supabase connection
    supabase.from('appointments').select('count').then(
      ({ data, error }) => {
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name as keyof AppointmentFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Partial<AppointmentFormData> = {}
    console.log("Validating form data:", formData)

    if (!formData.address.trim()) {
      console.log("Address validation failed: empty address")
      newErrors.address = "Address is required"
    }
    if (!formData.year) {
      console.log("Year validation failed: empty year")
      newErrors.year = "Year is required"
    }
    if (!formData.make) {
      console.log("Make validation failed: empty make")
      newErrors.make = "Make is required"
    }
    if (!formData.model.trim()) {
      console.log("Model validation failed: empty model")
      newErrors.model = "Model is required"
    }
    if (!formData.appointmentDate) {
      console.log("Date validation failed: empty date")
      newErrors.appointmentDate = "Date is required"
    }
    if (!formData.appointmentTime) {
      console.log("Time validation failed: empty time")
      newErrors.appointmentTime = "Time is required"
    }

    // Add validation for appointment date/time
    if (formData.appointmentDate && formData.appointmentTime) {
      const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`)
      const now = new Date()
      console.log("Validating appointment date:", {
        appointmentDateTime,
        now,
        isValid: appointmentDateTime > now
      })
      
      if (appointmentDateTime < now) {
        console.log("Date validation failed: appointment in the past")
        newErrors.appointmentDate = "Appointment date must be in the future"
      }
    }

    console.log("Validation errors:", newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    console.log("Form submission started")

    if (!validateForm()) {
      console.log("Form validation failed, stopping submission")
      return
    }

    setIsSubmitting(true)
    console.log("Form is valid, proceeding with submission")

    try {
      // Check Supabase connection first
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Supabase environment variables missing")
        throw new Error("Supabase environment variables are not configured")
      }

      // Force refresh the schema cache with error handling
      console.log("Refreshing schema cache...")
      const { error: cacheError } = await supabase.rpc("reload_schema_cache")
      if (cacheError) {
        console.warn("Schema cache refresh failed:", cacheError)
        // Continue anyway as this is not critical
      } else {
        console.log("Schema cache refreshed successfully")
      }

      // Combine date and time for the appointment
      const appointmentDateTime = `${formData.appointmentDate}T${formData.appointmentTime}`
      const now = new Date().toISOString()

      // Validate appointment date is in the future
      const appointmentDate = new Date(appointmentDateTime)
      if (appointmentDate < new Date()) {
        console.error("Invalid appointment date:", appointmentDate)
        throw new Error("Appointment date must be in the future")
      }

      const initialAppointmentData = {
        location: formData.address,
        appointment_date: appointmentDateTime,
        status: "draft",
        notes: "Initial appointment details submitted",
        mechanic_id: null,
        created_at: now,
        updated_at: now,
        source: "landing_page",
        user_id: null,
      }

      console.log("Creating appointment with data:", initialAppointmentData)

      // Create the appointment with initial status
      const { data: createdAppointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert([initialAppointmentData])
        .select()

      if (appointmentError) {
        console.error("Error creating appointment:", appointmentError)
        throw new Error(`Failed to create appointment: ${appointmentError.message}`)
      }

      if (!createdAppointment || createdAppointment.length === 0) {
        console.error("No appointment data returned after creation")
        throw new Error("No appointment data returned after creation")
      }

      console.log("Appointment created successfully:", createdAppointment)

      // Create the vehicle with the appointment_id
      const appointmentId = createdAppointment[0].id
      const vehicleData = {
        appointment_id: appointmentId,
        vin: formData.vin || null,
        year: Number.parseInt(formData.year),
        make: formData.make,
        model: formData.model,
        mileage: formData.mileage ? Number.parseInt(formData.mileage) : null,
        created_at: now,
        updated_at: now,
      }

      console.log("Creating vehicle with data:", vehicleData)

      const { error: vehicleError } = await supabase
        .from("vehicles")
        .insert([vehicleData])

      if (vehicleError) {
        console.error("Error creating vehicle:", vehicleError)
        // Try to delete the appointment if vehicle creation fails
        console.log("Attempting to delete appointment after vehicle creation failure")
        await supabase.from("appointments").delete().eq("id", appointmentId)
        throw new Error(`Failed to create vehicle: ${vehicleError.message}`)
      }

      console.log("Vehicle created successfully for appointment:", appointmentId)

      // Show success message
      toast({
        title: "Success",
        description: "Appointment created successfully! Redirecting to next step...",
      })

      // Navigate to the book appointment page
      console.log("Redirecting to book appointment page")
      router.push(`/book-appointment?appointmentId=${appointmentId}`)
    } catch (error) {
      console.error("Error in appointment creation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log("Form submission completed")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <SiteHeader />

      {/* Log In and Sign Up Buttons */}
      <div className="flex justify-center gap-4 mt-6 mb-2">
        <Link href="/login">
          <button
            className="bg-[#294a46] text-white px-6 py-2 rounded-full font-semibold shadow hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-[#294a46] transition"
            aria-label="Log In"
          >
            Log In
          </button>
        </Link>
        <Link href="/signup">
          <button
            className="bg-white text-[#294a46] border border-[#294a46] px-6 py-2 rounded-full font-semibold shadow hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#294a46] transition"
            aria-label="Sign Up"
          >
            Sign Up
          </button>
        </Link>
      </div>

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
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter complete address (123 Main St, City, State)"
                  className={`block w-full p-4 pl-10 pr-16 text-sm text-gray-900 border ${errors.address ? "border-red-500" : "border-gray-300"} rounded-lg bg-white focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]`}
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
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Model"
                  className={`w-full h-[46px] px-2 text-sm border ${errors.model ? "border-red-500" : "border-gray-200"} rounded-md bg-gray-50`}
                />
                {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
              </div>

              <div className="relative w-[30%]">
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  placeholder="VIN (optional)"
                  className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                />
              </div>

              <div className="relative w-[15%]">
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  placeholder="Mileage"
                  className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                />
              </div>
            </div>

            {/* Date Time Selector */}
            <div className="mb-6">
              <DateTimeSelector
                onDateTimeChange={useCallback((date, time) => {
                  // Convert the selected date and time to the format expected by the form
                  const formattedDate = date.toISOString().split("T")[0]

                  // Handle the "Now" case
                  let formattedTime
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

                  setFormData((prev) => ({
                    ...prev,
                    appointmentDate: formattedDate,
                    appointmentTime: formattedTime,
                  }))
                }, [])}
              />
            </div>

            {/* Continue Button */}
            <div className="flex justify-center mb-8">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#294a46] hover:bg-[#1e3632] text-white font-medium py-6 px-10 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
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
                <div className="w-20 h-20 border-2 border-[#294a46] rounded flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-[#294a46]" />
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
              <Settings className="h-10 w-10 mb-4" />
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
              <Home className="h-10 w-10 mb-4" />
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
