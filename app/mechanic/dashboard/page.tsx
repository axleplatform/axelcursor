"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User, Loader2, Clock, MapPin, Check, X } from "lucide-react"
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

export default function MechanicDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<any[]>([])
  const [quotedAppointments, setQuotedAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Check if user is authenticated and get mechanic ID
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication in dashboard...")
        setIsAuthLoading(true)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        console.log("Auth check result:", { user: user?.id, error: authError })

        if (authError) throw authError

        if (!user) {
          console.log("No user found, redirecting to login")
          toast({
            title: "Authentication required",
            description: "Please log in to access your dashboard",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        // Get mechanic profile
        console.log("Fetching mechanic profile...")
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        console.log("Profile fetch result:", { profile, error: profileError })

        if (profileError) {
          if (profileError.code === "PGRST116") {
            console.log("No profile found, redirecting to onboarding")
            toast({
              title: "Profile not found",
              description: "Please complete your onboarding first",
              variant: "destructive",
            })
            router.push("/onboarding-mechanic-1")
            return
          }
          throw profileError
        }

        if (!profile.onboarding_completed) {
          console.log("Onboarding not completed, redirecting to appropriate step")
          const step = profile.onboarding_step || "personal_info"
          let redirectPath = "/onboarding-mechanic-1"

          switch (step) {
            case "personal_info":
              redirectPath = "/onboarding-mechanic-1"
              break
            case "professional_info":
              redirectPath = "/onboarding-mechanic-2"
              break
            case "certifications":
              redirectPath = "/onboarding-mechanic-3"
              break
            case "rates":
              redirectPath = "/onboarding-mechanic-4"
              break
            case "profile":
              redirectPath = "/onboarding-mechanic-5"
              break
            default:
              redirectPath = "/onboarding-mechanic-1"
          }

          toast({
            title: "Complete your profile",
            description: "Please complete your onboarding process first",
          })
          router.push(redirectPath)
          return
        }

        console.log("Setting mechanic profile and ID")
        setMechanicProfile(profile)
        setMechanicId(profile.id)

        // Fetch appointments
        console.log("Fetching appointments...")
        const [available, quoted, upcoming] = await Promise.all([
          getAvailableAppointmentsForMechanic(profile.id),
          getQuotedAppointmentsForMechanic(profile.id),
          supabase
            .from("appointments")
            .select("*, vehicles(*)")
            .eq("mechanic_id", profile.id)
            .eq("status", "confirmed")
            .gte("scheduled_time", new Date().toISOString())
            .order("scheduled_time", { ascending: true }),
        ])

        console.log("Appointments fetched:", { available, quoted, upcoming })
        setAvailableAppointments(available || [])
        setQuotedAppointments(quoted || [])
        setUpcomingAppointments(upcoming.data || [])
      } catch (error: any) {
        console.error("Dashboard initialization error:", error)
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
  }, [router, toast])

  // Handle submitting a quote
  const handleSubmitQuote = async (appointmentId: string) => {
    if (!mechanicId || !priceInput || Number.parseFloat(priceInput) <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const price = Number.parseFloat(priceInput)

      const { success, error } = await createOrUpdateQuote(mechanicId, appointmentId, price)

      if (!success) {
        throw new Error(error)
      }

      // Update local state - remove from available appointments
      setAvailableAppointments((prev) => prev.filter((a) => a.id !== appointmentId))

      // Reset price input
      setPriceInput("")

      // Show success message
      toast({
        title: "Quote submitted",
        description: `Your quote of $${price} has been submitted`,
      })

      // Move to next available appointment if there are more
      if (availableAppointments.length > 1) {
        setCurrentAvailableIndex((prev) => (prev >= availableAppointments.length - 1 ? 0 : prev + 1))
      }
    } catch (error: any) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle skipping an appointment
  const handleSkipAppointment = (appointmentId: string) => {
    // Just remove from local state - we don't need to update the backend
    setAvailableAppointments((prev) => prev.filter((a) => a.id !== appointmentId))

    // Reset price input
    setPriceInput("")

    // Move to next available appointment if there are more
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev) => (prev >= availableAppointments.length - 1 ? 0 : prev + 1))
    }
  }

  // Navigate through available appointments
  const goToNextAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev) => (prev + 1) % availableAppointments.length)
      setPriceInput("")
    }
  }

  const goToPrevAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev) => (prev === 0 ? availableAppointments.length - 1 : prev - 1))
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
          <UpcomingAppointments
            appointments={upcomingAppointments}
            isLoading={isAppointmentsLoading}
            onStart={() => {}}
            onCancel={() => {}}
            onUpdatePrice={() => {}}
          />

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
              </div>
            ) : (
              <div className="relative">
                {/* Navigation buttons for multiple appointments */}
                {availableAppointments.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevAvailable}
                      className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Previous appointment"
                      disabled={isProcessing}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={goToNextAvailable}
                      className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Next appointment"
                      disabled={isProcessing}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Current appointment details */}
                {availableAppointments[currentAvailableIndex] && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-medium text-gray-900">
                          {currentAvailableIndex + 1}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-gray-700" />
                        </div>
                        <span className="text-white line-clamp-1">
                          {availableAppointments[currentAvailableIndex].location}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSkipAppointment(availableAppointments[currentAvailableIndex].id)}
                        className="text-gray-200 hover:text-white"
                        aria-label="Skip appointment"
                        disabled={isProcessing}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mb-4 flex justify-center">
                      <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 w-fit bg-white">
                        <span className="text-2xl font-bold mr-2 text-gray-900">$</span>
                        <input
                          type="number"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder="Enter price"
                          className="border-none outline-none text-2xl font-bold bg-transparent w-32 text-gray-900"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>

                    <div className="text-white mb-4 text-center">
                      {formatDate(availableAppointments[currentAvailableIndex].appointment_date)}
                    </div>

                    <div className="bg-[#e6eeec] p-4 rounded-md mb-4 text-gray-900">
                      <div className="flex items-center justify-center mb-3">
                        <span className="mr-2">Does car run?</span>
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          {availableAppointments[currentAvailableIndex].car_runs ? (
                            <Check className="h-3 w-3 text-white" />
                          ) : (
                            <X className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="ml-1">
                          {availableAppointments[currentAvailableIndex].car_runs ? "Yes" : "No"}
                        </span>
                      </div>

                      {availableAppointments[currentAvailableIndex].selected_services &&
                        availableAppointments[currentAvailableIndex].selected_services.length > 0 && (
                          <div className="mb-3">
                            <div className="font-semibold mb-1">Recommended Services:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {availableAppointments[currentAvailableIndex].selected_services.map(
                                (service: string, index: number) => (
                                  <li key={index}>{service}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {availableAppointments[currentAvailableIndex].selected_car_issues &&
                        availableAppointments[currentAvailableIndex].selected_car_issues.length > 0 && (
                          <div className="mb-3">
                            <div className="font-semibold mb-1">Reported Issues:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {availableAppointments[currentAvailableIndex].selected_car_issues.map(
                                (issue: string, index: number) => (
                                  <li key={index}>{issue}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {availableAppointments[currentAvailableIndex].issue_description && (
                        <div>
                          <div className="font-semibold mb-1">Customer Description:</div>
                          <p className="italic text-gray-700">
                            "{availableAppointments[currentAvailableIndex].issue_description}"
                          </p>
                        </div>
                      )}
                    </div>

                    {availableAppointments[currentAvailableIndex].vehicles && (
                      <div className="text-center mb-6">
                        <div className="font-semibold text-lg text-white">
                          {availableAppointments[currentAvailableIndex].vehicles.year}{" "}
                          {availableAppointments[currentAvailableIndex].vehicles.make}{" "}
                          {availableAppointments[currentAvailableIndex].vehicles.model}
                        </div>
                        {availableAppointments[currentAvailableIndex].vehicles.vin && (
                          <div className="text-gray-200 text-sm">
                            VIN: {availableAppointments[currentAvailableIndex].vehicles.vin}
                          </div>
                        )}
                        {availableAppointments[currentAvailableIndex].vehicles.mileage && (
                          <div className="text-gray-200 text-sm">
                            Mileage: {availableAppointments[currentAvailableIndex].vehicles.mileage} miles
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={() => handleSubmitQuote(availableAppointments[currentAvailableIndex].id)}
                        disabled={isProcessing || !priceInput || Number.parseFloat(priceInput) <= 0}
                        className="bg-white text-[#294a46] font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-gray-100 hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
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
                        onClick={() => handleSkipAppointment(availableAppointments[currentAvailableIndex].id)}
                        disabled={isProcessing}
                        className="border border-white text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        Skip
                      </button>
                    </div>

                    {availableAppointments.length > 1 && (
                      <div className="flex justify-center mt-4 gap-1">
                        {availableAppointments.map((_: any, index: number) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${index === currentAvailableIndex ? "bg-white" : "bg-gray-300"}`}
                          ></div>
                        ))}
                      </div>
                    )}
                  </>
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
                      <p className="text-lg font-bold">${appointment.quote.price}</p>
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
                      <span>Quote submitted: {new Date(appointment.quote.created_at).toLocaleDateString()}</span>
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
      </div>

      <Footer />
    </div>
  )
}
