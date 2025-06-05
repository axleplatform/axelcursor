"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User, Loader2, Clock, MapPin, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { UpcomingAppointments } from "@/components/upcoming-appointments"
import { useToast } from "@/components/ui/use-toast"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import MechanicSchedule from "@/components/mechanic-schedule"
import {
  getAvailableAppointmentsForMechanic,
  getQuotedAppointmentsForMechanic,
  createOrUpdateQuote,
} from "@/lib/mechanic-quotes"
import { formatDate } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  car_runs?: boolean
  selected_services?: string[]
  vehicles?: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  }
  quote?: {
    id: string
    price: number
    created_at: string
  }
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
  isLoading: boolean
  onStart: (id: string) => Promise<boolean>
  onCancel: (id: string) => Promise<boolean>
  onUpdatePrice: (id: string, price: number) => Promise<boolean>
}

export default function MechanicDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<Appointment[]>([])
  const [quotedAppointments, setQuotedAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Real-time subscription handlers
  useEffect(() => {
    if (!mechanicId) return

    // Subscribe to appointment changes
    const appointmentsSubscription = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `status=eq.pending`
        },
        async (payload) => {
          console.log('Appointment change received:', payload)
          
          // Refresh all appointments when any change occurs
          const [available, quoted, upcoming] = await Promise.all([
            getAvailableAppointmentsForMechanic(mechanicId),
            getQuotedAppointmentsForMechanic(mechanicId),
            supabase
              .from("appointments")
              .select("*, vehicles(*)")
              .eq("mechanic_id", mechanicId)
              .in("status", ["confirmed", "in_progress", "pending_payment"])
              .order("appointment_date", { ascending: true }),
          ])

          console.log('Refreshed appointments:', {
            available: available.appointments?.length || 0,
            quoted: quoted.appointments?.length || 0,
            upcoming: upcoming.data?.length || 0
          })

          if (available.success) setAvailableAppointments(available.appointments || [])
          if (quoted.success) setQuotedAppointments(quoted.appointments || [])
          setUpcomingAppointments(upcoming.data || [])
        }
      )
      .subscribe()

    // Subscribe to quote changes
    const quotesSubscription = supabase
      .channel('quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mechanic_quotes',
        },
        async (payload) => {
          console.log('Quote change received:', payload)
          
          // Refresh available and quoted appointments when quotes change
          const [available, quoted] = await Promise.all([
            getAvailableAppointmentsForMechanic(mechanicId),
            getQuotedAppointmentsForMechanic(mechanicId),
          ])

          console.log('Refreshed appointments after quote change:', {
            available: available.appointments?.length || 0,
            quoted: quoted.appointments?.length || 0
          })

          if (available.success) setAvailableAppointments(available.appointments || [])
          if (quoted.success) setQuotedAppointments(quoted.appointments || [])
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      appointmentsSubscription.unsubscribe()
      quotesSubscription.unsubscribe()
    }
  }, [mechanicId])

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 Starting authentication check in dashboard...")
        setIsAuthLoading(true)
        setAuthError(null)

        // First try to get the session with retries
        let session = null
        let retries = 5 // Increased retries
        
        while (retries > 0) {
          console.log("🔄 Attempting to get session, attempt", 6 - retries)
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error("❌ Session error:", sessionError)
            throw sessionError
          }
          
          if (currentSession) {
            session = currentSession
            console.log("✅ Session found on attempt", 6 - retries, {
              userId: session.user.id,
              email: session.user.email,
              expiresAt: session.expires_at
            })
            break
          }
          
          console.log("⏳ Session not found, retrying...", { retriesLeft: retries - 1 })
          await new Promise(resolve => setTimeout(resolve, 2000)) // Increased delay
          retries--
        }

        if (!session) {
          console.log("❌ No session found after retries, redirecting to login")
          setAuthError("No valid session found")
          toast({
            title: "Authentication required",
            description: "Please log in to access your dashboard",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        // Get mechanic profile with detailed logging
        console.log("🔍 Fetching mechanic profile for user:", session.user.id)
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()

        if (profileError) {
          console.error("❌ Error fetching mechanic profile:", profileError)
          throw profileError
        }

        if (!profile) {
          console.log("❌ No mechanic profile found, redirecting to onboarding")
          setAuthError("No mechanic profile found")
          router.push("/onboarding-mechanic-1")
          return
        }

        if (!profile.onboarding_completed) {
          console.log("❌ Onboarding not completed, redirecting to appropriate step")
          const step = profile.onboarding_step || "personal_info"
          router.push(`/onboarding-mechanic-${getStepNumber(step)}`)
          return
        }

        console.log("✅ Mechanic profile found:", {
          id: profile.id,
          userId: profile.user_id,
          onboardingCompleted: profile.onboarding_completed,
          onboardingStep: profile.onboarding_step
        })

        setMechanicId(session.user.id)
        setMechanicProfile(profile)

        // Fetch appointments with detailed logging
        console.log("📅 Fetching appointments...")
        const [available, quoted, upcoming] = await Promise.all([
          getAvailableAppointmentsForMechanic(session.user.id),
          getQuotedAppointmentsForMechanic(session.user.id),
          supabase
            .from("appointments")
            .select("*, vehicles(*)")
            .eq("mechanic_id", session.user.id)
            .in("status", ["confirmed", "in_progress", "pending_payment"])
            .order("appointment_date", { ascending: true }),
        ])

        console.log("📊 Appointments fetched:", {
          available: available?.length || 0,
          quoted: quoted?.length || 0,
          upcoming: upcoming?.data?.length || 0
        })

        setAvailableAppointments(available || [])
        setQuotedAppointments(quoted || [])
        setUpcomingAppointments(upcoming?.data || [])
      } catch (error: any) {
        console.error("❌ Error in auth check:", error)
        setAuthError(error.message || "Failed to load dashboard")
        toast({
          title: "Error",
          description: "Failed to load dashboard. Please try again.",
          variant: "destructive",
        })
        router.push("/login")
      } finally {
        setIsAuthLoading(false)
        setIsAppointmentsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast, supabase])

  const getStepNumber = (step: string) => {
    switch (step) {
      case "personal_info": return "1"
      case "professional_info": return "2"
      case "certifications": return "3"
      case "rates": return "4"
      case "profile": return "5"
      default: return "1"
    }
  }

  // Handle submitting a quote
  const handleSubmitQuote = async (appointmentId: string): Promise<boolean> => {
    if (!mechanicId || !priceInput || Number.parseFloat(priceInput) <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price",
        variant: "destructive",
      })
      return false
    }

    const price = Number.parseFloat(priceInput)
    
    // Validate price range
    if (price < 10 || price > 10000) {
      toast({
        title: "Invalid price range",
        description: "Price must be between $10 and $10,000",
        variant: "destructive",
      })
      return false
    }

    setIsProcessing(true)

    try {
      const { success, error } = await createOrUpdateQuote(
        mechanicId,
        appointmentId,
        price,
        "1-2 hours", // Default ETA
        "" // Default notes
      )

      if (!success) {
        throw new Error(error)
      }

      // Update local state - remove from available appointments
      setAvailableAppointments((prev: Appointment[]) => prev.filter((a: Appointment) => a.id !== appointmentId))

      // Reset price input
      setPriceInput("")

      // Show success message
      toast({
        title: "Quote submitted",
        description: `Your quote of $${price} has been submitted`,
      })

      // Move to next available appointment if there are more
      if (availableAppointments.length > 1) {
        setCurrentAvailableIndex((prev: number) => (prev >= availableAppointments.length - 1 ? 0 : prev + 1))
      }

      return true
    } catch (error: any) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle starting an appointment
  const handleStartAppointment = async (id: string): Promise<boolean> => {
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", id)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) => (appointment.id === id ? { ...appointment, status: "in_progress" } : appointment)),
      )

      toast({
        title: "Success",
        description: "Appointment started successfully.",
      })

      return true
    } catch (error) {
      console.error("Error starting appointment:", error)
      toast({
        title: "Error",
        description: "Failed to start appointment.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle cancelling an appointment
  const handleCancelAppointment = async (id: string): Promise<boolean> => {
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) => (appointment.id === id ? { ...appointment, status: "cancelled" } : appointment)),
      )

      toast({
        title: "Success",
        description: "Appointment cancelled successfully.",
      })

      return true
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Error",
        description: "Failed to cancel appointment.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle updating price
  const handleUpdatePrice = async (id: string, price: number): Promise<boolean> => {
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from("appointments")
        .update({ price })
        .eq("id", id)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) => (appointment.id === id ? { ...appointment, price } : appointment)),
      )

      toast({
        title: "Success",
        description: "Price updated successfully.",
      })

      return true
    } catch (error) {
      console.error("Error updating price:", error)
      toast({
        title: "Error",
        description: "Failed to update price.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Navigate through available appointments
  const goToNextAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev + 1) % availableAppointments.length)
      setPriceInput("")
    }
  }

  const goToPrevAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev === 0 ? availableAppointments.length - 1 : prev - 1))
      setPriceInput("")
    }
  }

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#294a46] mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{authError}</p>
            <button
              onClick={() => router.push("/login")}
              className="bg-[#294a46] text-white px-4 py-2 rounded-md hover:bg-[#1e3632] transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Main dashboard content
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader />

      {/* Dashboard Title and Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Mechanic Dashboard</h1>
          {mechanicProfile && <p className="text-lg text-gray-600 mt-1">Welcome back, {mechanicProfile.first_name}!</p>}

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Find appointments"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <button className="bg-[#294a46] text-white px-4 py-2 rounded-full hover:bg-[#1e3632] transition-colors flex items-center gap-2">
              Refer a friend
            </button>
            <div className="w-10 h-10 rounded-full bg-[#294a46] flex items-center justify-center text-white">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 pb-12 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Upcoming Appointments</h2>
            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#294a46]" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2">No Upcoming Appointments</h3>
                <p className="text-gray-600">
                  You don't have any upcoming appointments. New appointments will appear here when they're scheduled.
                </p>
              </div>
            ) : (
              <UpcomingAppointments
                appointments={upcomingAppointments}
                isLoading={isAppointmentsLoading}
                onStart={handleStartAppointment}
                onCancel={handleCancelAppointment}
                onUpdatePrice={handleUpdatePrice}
              />
            )}
          </div>

          {/* Column 2: Schedule */}
          <MechanicSchedule />

          {/* Column 3: Available Appointments */}
          <div className="bg-[#294a46] rounded-lg shadow-sm p-6 text-white">
            <h2 className="text-xl font-semibold mb-6">Available Appointments</h2>

            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : availableAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-white/70" />
                <h3 className="text-xl font-medium mb-2">No Available Appointments</h3>
                <p className="text-white/70">
                  There are no pending appointments at this time. Check back later for new requests.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full transition-colors"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Navigation buttons for multiple appointments */}
                {availableAppointments.length > 1 && (
                  <>
                    <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                      <button
                        onClick={goToPrevAvailable}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                        aria-label="Previous appointment"
                        disabled={isProcessing}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                      <button
                        onClick={goToNextAvailable}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                        aria-label="Next appointment"
                        disabled={isProcessing}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}

                {/* Current appointment details */}
                {availableAppointments[currentAvailableIndex] && (
                  <div className="bg-white/10 rounded-lg p-6">
                    {/* Vehicle Information */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">
                        {availableAppointments[currentAvailableIndex].vehicles?.year}{" "}
                        {availableAppointments[currentAvailableIndex].vehicles?.make}{" "}
                        {availableAppointments[currentAvailableIndex].vehicles?.model}
                      </h3>
                      {availableAppointments[currentAvailableIndex].vehicles?.vin && (
                        <p className="text-sm text-white/70">
                          VIN: {availableAppointments[currentAvailableIndex].vehicles.vin}
                        </p>
                      )}
                      {availableAppointments[currentAvailableIndex].vehicles?.mileage && (
                        <p className="text-sm text-white/70">
                          Mileage: {availableAppointments[currentAvailableIndex].vehicles.mileage} miles
                        </p>
                      )}
                    </div>

                    {/* Location and Date */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{availableAppointments[currentAvailableIndex].location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{formatDate(availableAppointments[currentAvailableIndex].appointment_date)}</span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Issue Description</h4>
                      <p className="text-sm text-white/70 bg-white/5 p-3 rounded-md">
                        {availableAppointments[currentAvailableIndex].issue_description || "No description provided"}
                      </p>
                    </div>

                    {/* Selected Services */}
                    {availableAppointments[currentAvailableIndex].selected_services && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Selected Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                            <span
                              key={index}
                              className="bg-white/20 text-xs px-3 py-1 rounded-full"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Car Status */}
                    {availableAppointments[currentAvailableIndex].car_runs !== null && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Car Status</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${availableAppointments[currentAvailableIndex].car_runs ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm">
                            {availableAppointments[currentAvailableIndex].car_runs
                              ? "Car is running"
                              : "Car is not running"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quote Input */}
                    <div className="mb-6">
                      <label htmlFor="price" className="block text-sm font-medium mb-2">
                        Your Quote (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70">$</span>
                        <input
                          type="number"
                          id="price"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder="Enter your price"
                          className="w-full bg-white/10 border border-white/20 rounded-md pl-8 pr-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          disabled={isProcessing}
                          min="10"
                          max="10000"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmitQuote(availableAppointments[currentAvailableIndex].id)}
                        disabled={isProcessing || !priceInput || Number.parseFloat(priceInput) <= 0}
                        className="flex-1 bg-white text-[#294a46] font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-gray-100 hover:shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center">
                            <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-[#294a46] rounded-full mr-2"></span>
                            Processing...
                          </span>
                        ) : (
                          "Submit Quote"
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(availableAppointments[currentAvailableIndex].id)}
                        disabled={isProcessing}
                        className="border border-white text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        Skip
                      </button>
                    </div>

                    {/* Pagination Dots */}
                    {availableAppointments.length > 1 && (
                      <div className="flex justify-center mt-4 gap-1">
                        {availableAppointments.map((_: Appointment, index: number) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${index === currentAvailableIndex ? "bg-white" : "bg-white/30"}`}
                          ></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quoted Appointments Section */}
        {quotedAppointments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Your Quoted Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotedAppointments.map((appointment) => (
                <Card key={appointment.id} className="p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{formatDate(appointment.appointment_date)}</h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{appointment.location}</span>
                      </div>
                    </div>
                    <div className="bg-[#294a46] text-white px-3 py-1 rounded-md">
                      <p className="text-lg font-bold">${appointment.quote?.price}</p>
                    </div>
                  </div>

                  {appointment.vehicles && (
                    <div className="mb-3 text-sm">
                      <div className="font-medium">
                        {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                      </div>
                      {appointment.vehicles.mileage && (
                        <div className="text-gray-600">Mileage: {appointment.vehicles.mileage}</div>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Quote submitted: {new Date(appointment.quote?.created_at || "").toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 text-xs bg-yellow-50 p-2 rounded border border-yellow-100">
                      Waiting for customer selection
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for No Appointments */}
        {!isAppointmentsLoading && 
         availableAppointments.length === 0 && 
         upcomingAppointments.length === 0 && 
         quotedAppointments.length === 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-8 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to Your Dashboard</h2>
            <p className="text-gray-600 mb-6">
              You don't have any appointments yet. When customers request service in your area, 
              you'll see them appear here.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-[#294a46] text-white px-6 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
              >
                Refresh
              </button>
              <button 
                onClick={() => router.push('/mechanic/profile')}
                className="border border-[#294a46] text-[#294a46] px-6 py-2 rounded-full hover:bg-[#294a46] hover:text-white transition-colors"
              >
                Update Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
