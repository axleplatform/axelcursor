"use client"

import React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Clock, MapPin, Check, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"

interface AppointmentData {
  id: string
  location: string
  appointment_date: string
  status: string
  price: number | null
  phone_number: string | null
  car_runs: boolean | null
  issue_description: string | null
  selected_services: string[] | null
  selected_car_issues: string[] | null
  notes: string | null
  user_id: string | null
  mechanic_id: string | null
  selected_quote_id: string | null
  source: string | null
  created_at: string
  updated_at: string
  vehicles: {
    id: string
    appointment_id: string
    vin: string | null
    year: number
    make: string
    model: string
    mileage: number | null
    created_at: string
    updated_at: string
  } | null
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: AppointmentData
  old: AppointmentData
}

export default function AppointmentConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Get appointment ID from either query param or path
  const appointmentId = searchParams.get("appointmentId") || pathname.split("/").pop()
  const { toast } = useToast()

  const [appointmentData, setAppointmentData] = React.useState<AppointmentData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Account creation form state
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: ""
  })
  const [showPassword, setShowPassword] = React.useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = React.useState(false)
  const [accountCreated, setAccountCreated] = React.useState(false)
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
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
            vehicles!fk_appointment_id(*)
          `)
          .eq("id", appointmentId)
          .single()

        if (error) throw error

        setAppointmentData(data)
        console.log("Fetched appointment data:", data)
      } catch (error) {
        console.error("Error fetching appointment data:", error)
        toast({
          title: "Error",
          description: "Failed to load appointment details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentData()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("appointment-confirmation")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${appointmentId}`,
        },
        (payload: RealtimePayload) => {
          console.log("Real-time update received:", payload)
          if (payload.eventType === "UPDATE") {
            setAppointmentData(payload.new)
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [appointmentId, toast])

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required"
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      errors.password = "Password is required"
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  // Handle account creation
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsCreatingAccount(true)
    setFormErrors({})

    try {
      // Create user account in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: "customer"
          }
        }
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          setFormErrors({ email: "Looks like you already have an account. Please sign in instead." })
        } else {
          throw authError
        }
        return
      }

      if (authData.user && appointmentData) {
        // Update the appointment with the new user_id
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ user_id: authData.user.id })
          .eq("id", appointmentData.id)

        if (updateError) {
          console.error("Error updating appointment:", updateError)
          // Don't throw here, account was created successfully
        }

        setAccountCreated(true)
        toast({
          title: "Account created!",
          description: "You can now track all your services.",
        })
      }
    } catch (error: any) {
      console.error("Error creating account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingAccount(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-[#294a46] rounded-full"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!appointmentData) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Appointment Not Found</h1>
            <p className="text-gray-600 mb-4">The appointment you're looking for doesn't exist or has been removed.</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="bg-[#294a46] text-white px-6 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
            >
              Return Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h1>
            <p className="text-gray-600">Your appointment has been successfully scheduled</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-700">Location</h3>
                    <p className="text-gray-600">{appointmentData.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-700">Date & Time</h3>
                    <p className="text-gray-600">{formatDate(appointmentData.appointment_date)}</p>
                      </div>
                    </div>

                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-gray-500 mt-1">🚗</div>
                    <div>
                    <h3 className="font-medium text-gray-700">Vehicle</h3>
                    <p className="text-gray-600">
                      {appointmentData.vehicles
                        ? `${appointmentData.vehicles.year} ${appointmentData.vehicles.make} ${appointmentData.vehicles.model}`
                        : "No vehicle information"}
                    </p>
                  </div>
                </div>

                {appointmentData.phone_number && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 text-gray-500 mt-1">📞</div>
                    <div>
                      <h3 className="font-medium text-gray-700">Phone Number</h3>
                      <p className="text-gray-600">{appointmentData.phone_number}</p>
                    </div>
                  </div>
                )}

                {appointmentData.price && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 text-gray-500 mt-1">$</div>
                    <div>
                      <h3 className="font-medium text-gray-700">Price</h3>
                      <p className="text-gray-600">${appointmentData.price}</p>
                    </div>
                  </div>
                )}

                {appointmentData.issue_description && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 text-gray-500 mt-1">!</div>
                    <div>
                      <h3 className="font-medium text-gray-700">Issue Description</h3>
                      <p className="text-gray-600">{appointmentData.issue_description}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="bg-[#294a46] text-white px-8 py-3 rounded-full hover:bg-[#1e3632] transition-colors"
                >
                  Return Home
                </button>
              </div>
            </div>

            {/* Right Column - Account Creation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {accountCreated ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Created!</h2>
                  <p className="text-gray-600 mb-6">You can now track all your services and get maintenance reminders.</p>
                  <button
                    onClick={() => router.push("/")}
                    className="bg-[#294a46] text-white px-6 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Save your service history</h2>
                  <p className="text-gray-600 mb-6">Create an account to track all your services and get maintenance reminders</p>
                  
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className={formErrors.fullName ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
                      />
                      {formErrors.fullName && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email address"
                        className={formErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Create a password"
                          className={`pr-10 ${formErrors.password ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <div className="h-4 w-4">🙈</div>
                          ) : (
                            <div className="h-4 w-4">👁️</div>
                          )}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingAccount}
                      className="w-full bg-[#294a46] text-white py-3 rounded-full hover:bg-[#1e3632] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isCreatingAccount ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                      Already have an account?{" "}
                      <button
                        onClick={() => router.push("/login")}
                        className="text-[#294a46] hover:text-[#1e3632] font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </>
              )}
              </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
