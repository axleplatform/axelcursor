"use client"

import { useState, useEffect } from "react"
import { Search, MapPin, X, Check, ChevronLeft, ChevronRight, User, Clock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { UpcomingAppointments } from "@/components/upcoming-appointments"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import {
  getAvailableAppointmentsForMechanic,
  getQuotedAppointmentsForMechanic,
  createOrUpdateQuote,
} from "@/lib/mechanic-quotes"

// Mock mechanic ID - in a real app, this would come from authentication
const DEMO_MECHANIC_ID = "demo-mechanic-123"

export default function MechanicDashboard() {
  const { toast } = useToast()
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<any[]>([])
  const [quotedAppointments, setQuotedAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true)

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsAppointmentsLoading(true)
        console.log("Fetching appointments for demo mechanic...")

        // Fetch all types of appointments
        const [available, quoted, upcoming] = await Promise.all([
          supabase
            .from("appointments")
            .select("*, vehicles(*)")
            .is("mechanic_id", null)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          getQuotedAppointmentsForMechanic(DEMO_MECHANIC_ID),
          supabase
            .from("appointments")
            .select("*, vehicles(*)")
            .eq("mechanic_id", DEMO_MECHANIC_ID)
            .eq("status", "confirmed")
            .gte("scheduled_time", new Date().toISOString())
            .order("scheduled_time", { ascending: true }),
        ])

        console.log("Appointments fetched:", { available, quoted, upcoming })
        setAvailableAppointments(available?.data || [])
        setQuotedAppointments(quoted?.appointments || [])
        setUpcomingAppointments(upcoming?.data || [])
      } catch (error) {
        console.error("Error fetching appointments:", error)
        toast({
          title: "Error",
          description: "Failed to load appointments. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsAppointmentsLoading(false)
      }
    }

    fetchAppointments()

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `status=eq.pending`,
        },
        () => {
          fetchAppointments()
        },
      )
      .subscribe()

    const quotesSubscription = supabase
      .channel("mechanic-quotes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanic_quotes",
          filter: `mechanic_id=eq.${DEMO_MECHANIC_ID}`,
        },
        () => {
          fetchAppointments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsSubscription)
      supabase.removeChannel(quotesSubscription)
    }
  }, [toast])

  // Handlers with toast notifications
  const handleStartAppointment = async (id: string) => {
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", id)
        .eq("mechanic_id", DEMO_MECHANIC_ID)

      if (error) throw error

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

  const handleCancelAppointment = async (id: string) => {
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("mechanic_id", DEMO_MECHANIC_ID)

      if (error) throw error

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

  const handleAcceptAppointment = async (id: string, price: number) => {
    if (!price || price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price.",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsProcessing(true)
      const { success, error } = await createOrUpdateQuote({
        appointment_id: id,
        mechanic_id: DEMO_MECHANIC_ID,
        price,
        eta: "1-2 hours", // Default ETA for demo
      })

      if (!success) {
        throw new Error(error)
      }

      toast({
        title: "Success",
        description: "Quote submitted successfully.",
      })

      // Move to the next available appointment if there are more
      if (currentAvailableIndex < availableAppointments.length - 1) {
        setCurrentAvailableIndex(currentAvailableIndex + 1)
      } else if (availableAppointments.length > 1) {
        // If we're at the last one, go back to the first one
        setCurrentAvailableIndex(0)
      }

      return true
    } catch (error) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDenyAppointment = async (id: string) => {
    try {
      setIsProcessing(true)
      // For denying, we just remove it from the available list
      setAvailableAppointments((prev) => prev.filter((a) => a.id !== id))
      toast({
        title: "Success",
        description: "Appointment removed from your list.",
      })

      // Move to the next available appointment if there are more
      if (currentAvailableIndex < availableAppointments.length - 1) {
        setCurrentAvailableIndex(currentAvailableIndex + 1)
      } else if (availableAppointments.length > 1) {
        // If we're at the last one, go back to the first one
        setCurrentAvailableIndex(0)
      }

      return true
    } catch (error) {
      console.error("Error denying appointment:", error)
      toast({
        title: "Error",
        description: "Failed to remove appointment.",
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
      setCurrentAvailableIndex((prev) => (prev + 1) % availableAppointments.length)
    }
  }

  const goToPrevAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev) => (prev === 0 ? availableAppointments.length - 1 : prev - 1))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Standard Site Header */}
      <SiteHeader />

      {/* Dashboard Title and Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

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
            onStart={handleStartAppointment}
            onCancel={handleCancelAppointment}
            onUpdatePrice={(id, price) => {
              toast({
                title: "Price Updated",
                description: `Price updated to $${price}`,
              })
              return Promise.resolve(true)
            }}
          />

          {/* Column 2: Schedule */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Schedule</h2>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#294a46]"></div>
                <span className="text-sm">Confirmed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-sm">Pending</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <button className="p-1 rounded-full hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <span className="font-medium">May 12 - May 18, 2025</span>
              </div>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              <div className="text-xs text-gray-500">Mon</div>
              <div className="text-xs text-gray-500">Tue</div>
              <div className="text-xs text-gray-500">Wed</div>
              <div className="text-xs text-gray-500">Thu</div>
              <div className="text-xs text-gray-500">Fri</div>
              <div className="text-xs text-gray-500">Sat</div>
              <div className="text-xs text-gray-500">Sun</div>

              <div className="text-sm font-medium">12</div>
              <div className="text-sm font-medium">13</div>
              <div className="text-sm font-medium">14</div>
              <div className="text-sm font-medium">15</div>
              <div className="text-sm font-medium">16</div>
              <div className="text-sm font-medium">17</div>
              <div className="text-sm font-medium text-[#294a46]">18</div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Monday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Tuesday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Wednesday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Thursday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Friday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3">
                <div className="font-medium mb-1">Saturday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>

              <div className="border border-gray-100 rounded-md p-3 bg-green-50">
                <div className="font-medium mb-1">Sunday</div>
                <div className="text-sm text-gray-500">No appointments</div>
              </div>
            </div>
          </div>

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
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          {availableAppointments[currentAvailableIndex].vehicles?.make}{" "}
                          {availableAppointments[currentAvailableIndex].vehicles?.model}
                        </h3>
                        <p className="text-sm text-white/70">
                          {availableAppointments[currentAvailableIndex].vehicles?.year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{availableAppointments[currentAvailableIndex].location}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Issue Description</h4>
                        <p className="text-sm text-white/70">
                          {availableAppointments[currentAvailableIndex].issue_description || "No description provided"}
                        </p>
                      </div>

                      {availableAppointments[currentAvailableIndex].selected_services && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Selected Services</h4>
                          <div className="flex flex-wrap gap-2">
                            {availableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                              <span
                                key={index}
                                className="bg-white/20 text-xs px-2 py-1 rounded-full"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium mb-1">Appointment Date</h4>
                        <p className="text-sm text-white/70">
                          {formatDate(availableAppointments[currentAvailableIndex].appointment_date)}
                        </p>
                      </div>

                      {availableAppointments[currentAvailableIndex].car_runs !== null && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Car Status</h4>
                          <p className="text-sm text-white/70">
                            {availableAppointments[currentAvailableIndex].car_runs
                              ? "Car is running"
                              : "Car is not running"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium mb-1">
                          Your Quote (USD)
                        </label>
                        <input
                          type="number"
                          id="price"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder="Enter your price"
                          className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          disabled={isProcessing}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAcceptAppointment(availableAppointments[currentAvailableIndex].id, Number(priceInput))}
                          className="flex-1 bg-white text-[#294a46] px-4 py-2 rounded-md hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                          disabled={isProcessing || !priceInput || Number(priceInput) <= 0}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center">
                              <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-[#294a46] rounded-full mr-2"></span>
                              Processing...
                            </span>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Submit Quote
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDenyAppointment(availableAppointments[currentAvailableIndex].id)}
                          className="flex-1 bg-white/10 text-white px-4 py-2 rounded-md hover:bg-white/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center">
                              <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                              Processing...
                            </span>
                          ) : (
                            <>
                              <X className="h-4 w-4" />
                              Skip
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
