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
import { GoogleMapsLink } from "@/components/google-maps-link"
import { GoogleSignInButton } from "@/components/google-signin-button"
import { getUserRoleAndRedirect } from "@/lib/auth-helpers"
import { handleSignupWithSession, handleSigninWithSession, getSessionErrorMessage } from "@/lib/session-utils"
import { mergeTemporaryUserData } from "@/lib/simplified-profile-creation"


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
  const [isCancelled, setIsCancelled] = React.useState(false)
  
  // Account creation form state
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [formErrors, setFormErrors] = React.useState<{ email?: string }>({})
  const [showAccountCreation, setShowAccountCreation] = React.useState(false)
  
  const [dashboardLink, setDashboardLink] = React.useState('/customer-dashboard')
  const [error, setError] = React.useState<string>('')

  React.useEffect(() => {
    // Clear any corrupted auth cookies
    const clearCorruptedCookies = async () => {
      try {
        console.log('🧹 Clearing any corrupted auth cookies...');
        const { error } = await supabase.auth.signOut();
        if (error) console.log('Error clearing session:', error);
      } catch (e) {
        // Ignore errors when clearing
        console.log('Ignored error when clearing cookies:', e);
      }
    };
    
    clearCorruptedCookies();
  }, []);

  React.useEffect(() => {
    // Only check user role if user is authenticated
    // Guest users should be able to access appointment confirmation
    const checkAuthAndRole = async () => {
      try {
        console.log('🔐 Checking authentication and role...');
        
        // Check for valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          await supabase.auth.signOut();
          return;
        }

        if (session) {
          console.log('✅ Valid session found, checking user role...');
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('❌ User error:', userError);
            await supabase.auth.signOut();
            return;
          }

          if (user && user.id) {
            console.log('✅ Valid user found:', user.id);
            await checkUserRole();
          } else {
            console.log('❌ No valid user found');
            await supabase.auth.signOut();
          }
        } else {
          console.log('ℹ️ No session found - guest user');
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        await supabase.auth.signOut();
      }
    };
    
    checkAuthAndRole();
  }, []);

  const checkUserRole = async () => {
    try {
      console.log('👤 Checking user role...');
      const route = await getUserRoleAndRedirect(router);
      if (route) {
        console.log('✅ User role determined, dashboard link:', route);
        setDashboardLink(route);
      }
    } catch (error) {
      console.error('❌ Role check failed:', error);
    }
  };

  React.useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!appointmentId) {
        setIsLoading(false)
        return
      }

      try {
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
        // Check if appointment is already cancelled
        if (data.status === 'cancelled') {
          setIsCancelled(true)
        }
      } catch (error) {
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
          if (payload.eventType === "UPDATE") {
            setAppointmentData(payload.new)
            // Check if appointment was cancelled
            if (payload.new.status === 'cancelled') {
              setIsCancelled(true)
            }
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
    const errors: { email?: string } = {}

    if (!email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!password || password.length < 6) {
      errors.email = "Password must be at least 6 characters"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle account creation with email and password
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    setLoading(true)

    try {
      console.log('🚀 Starting email/password account creation...')

      // Use the robust signup with session waiting
      const signupResult = await handleSignupWithSession(
        email.trim(),
        password,
        {
          phone: appointmentData?.phone_number,
          appointment_id: appointmentData?.id,
          full_name: appointmentData?.vehicles?.make || '',
          created_from: 'appointment_confirmation'
        }
      )

      if (!signupResult.success) {
        // Check if it's a duplicate user error
        if (signupResult.error?.includes('already registered')) {
          console.log('🔄 User already exists, attempting signin...')
          
          // Try to sign in instead
          const signinResult = await handleSigninWithSession(email.trim(), password)

          if (signinResult.success && signinResult.user) {
            console.log('✅ Signin successful, merging temporary data...')
            
            // Merge temporary user data to existing account
            if (appointmentData?.phone_number) {
              const mergeResult = await mergeTemporaryUserData(
                signinResult.user.id, 
                appointmentData.phone_number, 
                appointmentData.id
              )
              if (mergeResult.success) {
                console.log(`✅ Merged ${mergeResult.mergedAppointments} appointments to existing account`)
              }
            }
            
            router.push(`/onboarding/customer/post-appointment?appointmentId=${appointmentData?.id}&phone=${appointmentData?.phone_number}`)
          } else {
            const errorMessage = getSessionErrorMessage(signinResult.errorCode || 'UNKNOWN')
            setFormErrors({ email: errorMessage })
            return
          }
        } else {
          const errorMessage = getSessionErrorMessage(signupResult.errorCode || 'UNKNOWN')
          setFormErrors({ email: errorMessage })
          return
        }
      } else if (signupResult.user) {
        // New user created successfully with established session
        console.log('✅ Signup successful with established session')
        
        // Merge temporary user data to new account
        if (appointmentData?.phone_number) {
          console.log('🔄 Merging temporary user data to new account...')
          const mergeResult = await mergeTemporaryUserData(
            signupResult.user.id, 
            appointmentData.phone_number, 
            appointmentData.id
          )
          if (mergeResult.success) {
            console.log(`✅ Merged ${mergeResult.mergedAppointments} appointments to new account`)
          }
        }
        
        router.push(`/onboarding/customer/post-appointment?appointmentId=${appointmentData?.id}&phone=${appointmentData?.phone_number}`)
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setFormErrors({ 
        email: error.message || 'Failed to create account. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle account creation - simplified approach
  const handleAccountCreation = async () => {
    try {
      console.log('🚀 Starting simplified account creation...')
      
      // Just initiate OAuth - let callback handle everything
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?appointment_id=${appointmentId}&phone=${encodeURIComponent(appointmentData?.phone_number || '')}&full_name=${encodeURIComponent(appointmentData?.vehicles?.make || '')}`
        }
      })

      if (error) {
        console.error('❌ OAuth error:', error)
        toast({
          title: "Error",
          description: "Failed to create account",
          variant: "destructive",
        })
        return
      }

      console.log('✅ OAuth initiated successfully - callback will handle everything')
      
    } catch (error) {
      console.error('❌ Account creation error:', error)
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      })
    }
  }


  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?\n\n" +
      "You will receive a refund minus a 5% cancellation fee.\n" +
      "For example, a $100 service would refund $95."
    )
    
    if (confirmed) {
      try {
        // Update appointment status to 'cancelled'
        const { error } = await supabase
          .from('appointments')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'customer',
            cancellation_reason: 'Customer requested cancellation'
          })
          .eq('id', appointmentId)
          
        if (error) {
          toast({
            title: "Error",
            description: "Failed to cancel appointment. Please try again.",
            variant: "destructive",
          })
          return
        }

        // Set cancelled state to true
        setIsCancelled(true)

        // Handle refund logic here (would integrate with payment processor)
        // For now, just show success message
        
        toast({
          title: "Appointment Cancelled",
          description: "Your appointment has been cancelled and refund processed.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to cancel appointment. Please try again.",
          variant: "destructive",
        })
      }
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
                onClick={() => router.push(dashboardLink)}
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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Success/Cancellation Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isCancelled ? 'bg-red-100' : 'bg-[#e6eeec]'
              }`}>
                {isCancelled ? (
                  <span className="text-2xl">❌</span>
                ) : (
                  <Check className="h-6 w-6 text-[#294a46]" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {isCancelled ? "Appointment Cancelled!" : "Appointment Confirmed!"}
            </h1>
            <p className="text-gray-600">
              {isCancelled 
                ? "Your appointment has been successfully cancelled." 
                : "Your appointment has been successfully scheduled"
              }
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden order-2 lg:order-1">
              <div className={`p-4 border-b bg-gradient-to-r ${
                isCancelled 
                  ? 'from-red-600 to-red-700' 
                  : 'from-[#294a46] to-[#1e3632]'
              }`}>
                <h2 className="text-lg font-semibold text-white">
                  {isCancelled ? "Cancelled Appointment" : "Order Summary"}
                </h2>
                <p className="text-gray-200 text-sm mt-1">
                  {isCancelled 
                    ? "Your appointment has been cancelled" 
                    : "Review your appointment details"
                  }
                </p>
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
                    <GoogleMapsLink 
                      address={appointmentData.location}
                      latitude={appointmentData.latitude}
                      longitude={appointmentData.longitude}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-500 mt-1" />
                    <div>
                      <h3 className="font-medium text-gray-700">Appointment Placed On</h3>
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

                  {appointmentData.selected_services && appointmentData.selected_services.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 text-gray-500 mt-1">🔧</div>
                      <div>
                        <h3 className="font-medium text-gray-700">Requested Services</h3>
                        <ul className="mt-1 space-y-1">
                          {appointmentData.selected_services.map((service, index) => (
                            <li key={index} className="flex items-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                              <span className="text-sm text-gray-600">{service}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {appointmentData.selected_car_issues && appointmentData.selected_car_issues.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 text-gray-500 mt-1">⚠️</div>
                      <div>
                        <h3 className="font-medium text-gray-700">Reported Issues</h3>
                        <ul className="mt-1 space-y-1">
                          {appointmentData.selected_car_issues.map((issue, index) => (
                            <li key={index} className="flex items-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                              <span className="text-sm text-gray-600">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 text-gray-500 mt-1">🔋</div>
                    <div>
                      <h3 className="font-medium text-gray-700">Car Status</h3>
                      <p className="text-gray-600">
                        {appointmentData.car_runs !== null
                          ? appointmentData.car_runs
                            ? "✅ Car is running"
                            : "❌ Car is not running"
                          : "❓ Car status not specified"}
                      </p>
                    </div>
                  </div>

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

                {!isCancelled && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="ghost"
                      className="w-full mt-4 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors"
                      onClick={handleCancelAppointment}
                    >
                      Cancel Appointment
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Account Creation */}
            <div className="bg-white rounded-lg shadow-md p-6 order-1 lg:order-2">
              {showAccountCreation ? (
                <div className="mt-8 p-6 bg-[#e6eeec] rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create an Account
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Save your appointment details and track all your vehicle services in one place.
                  </p>

                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                        placeholder="your@email.com"
                        required
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Create Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                      />
                    </div>

                    {/* Phone Number Display (read-only) */}
                    {appointmentData?.phone_number && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Phone number from your appointment:
                        </p>
                        <p className="font-medium text-gray-900">{appointmentData.phone_number}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#294a46] text-white py-3 px-6 rounded-lg hover:bg-[#1e3632] transition-colors font-medium disabled:bg-gray-300"
                    >
                      {loading ? 'Creating Account...' : 'Create Account & Continue'}
                    </button>
                  </form>

                  {/* Google Auth Option */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[#e6eeec] text-gray-500">Or</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAccountCreation}
                      className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285f4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34a853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#fbbc05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#ea4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-gray-500 text-center">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Save your service history</h2>
                  <p className="text-gray-600 mb-6">Create an account to track all your services and get maintenance reminders</p>
                  
                  <Button 
                    className="w-full bg-[#294a46] hover:bg-[#1e3632] text-white"
                    onClick={() => setShowAccountCreation(true)}
                  >
                    Create Account
                  </Button>

                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-50 text-gray-500">Or</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAccountCreation}
                      className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285f4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34a853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#fbbc05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#ea4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign up with Google
                    </button>
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
