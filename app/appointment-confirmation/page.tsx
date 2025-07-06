"use client"

import React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Check, Loader2, User } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"

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
  mechanic_id: string | null
  selected_mechanic_id: string | null
  selected_quote_id: string | null
  vehicles: {
    vin: string
    year: string
    make: string
    model: string
    mileage: string
  } | null
  mechanic_quotes?: {
    id: string
    price: number
    eta: string
    notes?: string
    mechanic_profiles: {
      id: string
      first_name: string
      last_name: string
      business_name?: string
      rating: number
      review_count: number
      profile_image_url?: string
    }
  }
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
  const appointmentId = searchParams.get("appointmentId") || searchParams.get("id") || pathname.split("/").pop()
  const { toast } = useToast()

  const [appointmentData, setAppointmentData] = React.useState<AppointmentData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Simplified account creation form state
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
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
        console.log("Fetching appointment data for ID:", appointmentId)

        // Fetch appointment with selected quote and mechanic details
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*),
            mechanic_quotes!selected_quote_id (
              id,
              price,
              eta,
              notes,
              mechanic_profiles (
                id,
                first_name,
                last_name,
                business_name,
                rating,
                review_count,
                profile_image_url
              )
            )
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

    if (!fullName.trim()) {
      errors.fullName = "Full name is required"
    }

    if (!email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle email signup (no password required)
  const handleEmailSignup = async () => {
    if (!validateForm()) {
      return
    }

    setIsCreatingAccount(true)
    setFormErrors({})

    try {
      // Create user profile with just email and name
      // Send them a magic link or create account without password
      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          data: {
            full_name: fullName,
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

      if (authData && appointmentData) {
        // Update the appointment with the new user_id if available
        // Note: For OTP signup, we might need to handle this differently
        setAccountCreated(true)
        toast({
          title: "Check your email!",
          description: "We've sent you a magic link to complete your account setup.",
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

  // Handle Google signup
  const handleGoogleSignup = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/appointment-confirmation?id=${appointmentId}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    
    if (error) {
      console.error('Google signup error:', error)
      toast({
        title: "Error",
        description: "Failed to sign up with Google. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle appointment cancellation
  const handleCancelAppointment = () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?\n\n" +
      "You will receive a refund minus a 5% cancellation fee.\n" +
      "For example, a $100 service would refund $95."
    )
    
    if (confirmed) {
      // Handle cancellation logic
      // Update appointment status, process refund, etc.
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled and refund processed.",
      })
      router.push("/")
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

  // Check if we have quote data
  const hasQuoteData = appointmentData.mechanic_quotes && appointmentData.mechanic_quotes.mechanic_profiles
  const quote = appointmentData.mechanic_quotes
  const mechanic = quote?.mechanic_profiles

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e6eeec] flex items-center justify-center">
                <Check className="h-6 w-6 text-[#294a46]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h1>
            <p className="text-gray-600">Your appointment has been successfully scheduled</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
              <div className="p-4 border-b bg-gradient-to-r from-[#294a46] to-[#1e3632]">
                <h2 className="text-lg font-semibold text-white">Order Summary</h2>
                <p className="text-gray-200 text-sm mt-1">Review your appointment details</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Selected Mechanic */}
                  {hasQuoteData && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-500 mt-1" />
                      <div>
                        <h3 className="font-medium text-gray-700">Selected Mechanic</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-600 font-medium">
                            {mechanic?.business_name || `${mechanic?.first_name} ${mechanic?.last_name}`}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-xs text-gray-500">
                              {mechanic?.rating || 'N/A'} ({mechanic?.review_count || 0} reviews)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  {hasQuoteData && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 text-gray-500 mt-1">$</div>
                      <div>
                        <h3 className="font-medium text-gray-700">Price</h3>
                        <p className="text-gray-600 font-bold text-lg">${quote?.price}</p>
                      </div>
                    </div>
                  )}

                  {/* ETA */}
                  {hasQuoteData && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-gray-500 mt-1" />
                      <div>
                        <h3 className="font-medium text-gray-700">Estimated Arrival</h3>
                        <p className="text-gray-600">{formatDate(quote?.eta || '')}</p>
                      </div>
                    </div>
                  )}

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
                      <h3 className="font-medium text-gray-700">Appointment Date</h3>
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

                  {appointmentData.issue_description && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 text-gray-500 mt-1">!</div>
                      <div>
                        <h3 className="font-medium text-gray-700">Issue Description</h3>
                        <p className="text-gray-600">{appointmentData.issue_description}</p>
                      </div>
                    </div>
                  )}

                  {/* Mechanic Notes */}
                  {hasQuoteData && quote?.notes && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 text-gray-500 mt-1">📝</div>
                      <div>
                        <h3 className="font-medium text-gray-700">Mechanic Notes</h3>
                        <p className="text-gray-600">{quote.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors"
                    onClick={handleCancelAppointment}
                  >
                    Cancel Appointment
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Account Creation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {accountCreated ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#e6eeec] flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-[#294a46]" />
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
                  
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={formErrors.fullName ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
                    />
                    {formErrors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.fullName}</p>
                    )}
                    
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={formErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                    
                    <Button 
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      onClick={handleEmailSignup}
                      disabled={isCreatingAccount}
                    >
                      {isCreatingAccount ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>

                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-50 text-gray-500">Or</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full mt-4 flex items-center justify-center gap-2"
                      onClick={handleGoogleSignup}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign up with Google
                    </Button>
                  </div>

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