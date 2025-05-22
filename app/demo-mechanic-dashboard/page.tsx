"use client"

import { useState } from "react"
import { Search, MapPin, X, Check, ChevronLeft, ChevronRight, User, Clock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useMechanicAppointments } from "@/hooks/use-mechanic-appointments"
import { UpcomingAppointments } from "@/components/upcoming-appointments"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import Footer from "@/components/footer"

// Mock mechanic ID - in a real app, this would come from authentication
const DEMO_MECHANIC_ID = "demo-mechanic-123"

export default function MechanicDashboard() {
  const { toast } = useToast()
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)

  const {
    upcomingAppointments,
    availableAppointments,
    isLoading,
    error,
    startAppointment,
    cancelAppointment,
    acceptAppointment,
    denyAppointment,
  } = useMechanicAppointments(DEMO_MECHANIC_ID)

  // Handlers with toast notifications
  const handleStartAppointment = async (id: string) => {
    const success = await startAppointment(id)
    if (success) {
      toast({
        title: "Success",
        description: "Appointment started successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to start appointment.",
        variant: "destructive",
      })
    }
    return success
  }

  const handleCancelAppointment = async (id: string) => {
    const success = await cancelAppointment(id)
    if (success) {
      toast({
        title: "Success",
        description: "Appointment cancelled successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to cancel appointment.",
        variant: "destructive",
      })
    }
    return success
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

    const success = await acceptAppointment(id, price)
    if (success) {
      toast({
        title: "Success",
        description: "Appointment accepted successfully.",
      })
      // Move to the next available appointment if there are more
      if (currentAvailableIndex < availableAppointments.length - 1) {
        setCurrentAvailableIndex(currentAvailableIndex + 1)
      } else if (availableAppointments.length > 1) {
        // If we're at the last one, go back to the first one
        setCurrentAvailableIndex(0)
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to accept appointment.",
        variant: "destructive",
      })
    }
    return success
  }

  const handleDenyAppointment = async (id: string) => {
    const success = await denyAppointment(id)
    if (success) {
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
    } else {
      toast({
        title: "Error",
        description: "Failed to remove appointment.",
        variant: "destructive",
      })
    }
    return success
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

  // State for price input in available appointments
  const [priceInput, setPriceInput] = useState<string>("")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Standard Site Header */}
      <SiteHeader />

      {/* Dashboard Title and Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
              <p>{error}</p>
            </div>
          )}

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
            isLoading={isLoading}
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

            {isLoading ? (
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
                  <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                    <button
                      onClick={goToPrevAvailable}
                      className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Previous appointment"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {availableAppointments.length > 1 && (
                  <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                    <button
                      onClick={goToNextAvailable}
                      className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Next appointment"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
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
                            {availableAppointments[currentAvailableIndex].selected_services.map((service, index) => (
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
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAcceptAppointment(availableAppointments[currentAvailableIndex].id, Number(priceInput))}
                          className="flex-1 bg-white text-[#294a46] px-4 py-2 rounded-md hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleDenyAppointment(availableAppointments[currentAvailableIndex].id)}
                          className="flex-1 bg-white/10 text-white px-4 py-2 rounded-md hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Deny
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
