'use client';

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { formatDate, formatRelativeTime } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import type {
  Appointment,
  MechanicProfile,
  MechanicQuote,
  NotificationState,
  DateOption,
  AppointmentWithRelations,
  MechanicSkip,
} from "@/types/index"

// Server and client safe text escaping
function universalSafeText(content: any): string {
  if (!content) return '';
  const str = typeof content === 'string' ? content : String(content);
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')
    .replace(/\//g, '&#47;')
    .replace(/\\/g, '&#92;');
}

export default function MechanicDashboard() {
  // Utility to safely render text content
  const safeText = (content: any): string => {
    if (!content) return ""
    return String(content)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/{/g, "&#123;")
      .replace(/}/g, "&#125;")
  }

  const { toast } = useToast()
  const router = useRouter()
  const isMobile = useIsMobile()
  
  // State declarations
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<MechanicProfile | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isMechanicLoading, setIsMechanicLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableAppointments, setAvailableAppointments] = useState<AppointmentWithRelations[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithRelations[]>([])
  const [skippedAppointments, setSkippedAppointments] = useState<MechanicSkip[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState<boolean>(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [currentUpcomingIndex, setCurrentUpcomingIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [restoredToday, setRestoredToday] = useState<Set<string>>(new Set())
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showScheduleCancelModal, setShowScheduleCancelModal] = useState(false)
  const [showScheduleEditModal, setShowScheduleEditModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isFromSchedule, setIsFromSchedule] = useState(false)

  // Helper functions
  const isPastETA = (appointment: AppointmentWithRelations): boolean => {
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
    if (!myQuote?.eta) return false

    const etaDate = new Date(myQuote.eta)
    const currentDate = new Date()

    const etaMidnight = new Date(etaDate.getFullYear(), etaDate.getMonth(), etaDate.getDate())
    const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

    return currentMidnight > etaMidnight
  }

  const isRestoredToday = (appointmentId: string): boolean => {
    return restoredToday.has(appointmentId)
  }

  const shouldShowInUpcoming = (appointment: AppointmentWithRelations): boolean => {
    if (isRestoredToday(appointment.id)) {
      return true
    }

    if (isPastETA(appointment)) {
      return false
    }

    if (appointment.status === "cancelled") {
      return isRestoredToday(appointment.id)
    }

    if (appointment.edited_after_quotes) {
      return false
    }

    return true
  }

  const handleRestoreAppointment = (appointment: AppointmentWithRelations) => {
    setRestoredToday((prev: Set<string>) => new Set([...prev, appointment.id]))
  }

  const handleToggleCancelledAppointment = (appointment: AppointmentWithRelations) => {
    if (appointment.status === "cancelled") {
      if (isRestoredToday(appointment.id)) {
        setRestoredToday((prev: Set<string>) => {
          const newSet = new Set(prev)
          newSet.delete(appointment.id)
          return newSet
        })
        toast({
          title: "Appointment Hidden",
          description: "Cancelled appointment has been hidden from upcoming appointments.",
        })
      } else {
        handleRestoreAppointment(appointment)
        toast({
          title: "Appointment Restored",
          description: "Cancelled appointment has been restored to upcoming appointments.",
        })
      }
    }
  }

  const handleScheduleCancel = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment)
    setShowScheduleCancelModal(true)
  }

  const handleScheduleEdit = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment)
    setEditDate(formatDate(appointment.appointment_date))
    setEditTime("09:00") // Default time since appointment_time doesn't exist
    setShowScheduleEditModal(true)
  }

  const navigateToAppointmentFromSchedule = (appointment: AppointmentWithRelations) => {
    setCurrentUpcomingIndex(upcomingAppointments.findIndex(apt => apt.id === appointment.id))
  }

  const showNotification = (message: string, type: NotificationState["type"] = "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/book-appointment')
      toast({
        title: "Link Copied!",
        description: "Referral link has been copied to clipboard.",
      })
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
      })
    }
  }

  const searchAppointments = (appointments: AppointmentWithRelations[], query: string): AppointmentWithRelations[] => {
    if (!query.trim()) return appointments
    
    const lowerQuery = query.toLowerCase()
    return appointments.filter(appointment => {
      const vehicle = appointment.vehicles
      const vehicleText = `${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}`.toLowerCase()
      const locationText = (appointment.location || '').toLowerCase()
      const issueText = (appointment.issue_description || '').toLowerCase()
      
      return vehicleText.includes(lowerQuery) || 
             locationText.includes(lowerQuery) || 
             issueText.includes(lowerQuery)
    })
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? `$${price.toFixed(0)}` : `$${price.toFixed(2)}`
  }

  const getAvailableDates = (): DateOption[] => {
    const dates: DateOption[] = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
      })
    }
    
    return dates
  }

  const getTimeSlots = (date: string): DateOption[] => {
    const slots: DateOption[] = []
    const [hours, minutes] = [9, 0] // Start at 9 AM
    
    for (let i = 0; i < 9; i++) { // 9 slots, 1 hour apart
      const hour = hours + i
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      slots.push({
        value: timeString,
        label: timeString
      })
    }
    
    return slots
  }

  const navigateToNextUpcoming = () => {
    setCurrentUpcomingIndex((prev) => (prev + 1) % filteredUpcomingAppointments.length)
  }

  const navigateToPreviousUpcoming = () => {
    setCurrentUpcomingIndex((prev) => prev === 0 ? filteredUpcomingAppointments.length - 1 : prev - 1)
  }

  const handleScheduleAppointmentClick = (appointment: AppointmentWithRelations) => {
    setCurrentAvailableIndex(availableAppointments.findIndex(apt => apt.id === appointment.id))
  }

  // Missing helper functions
  const isWithinTwoDays = (appointment: AppointmentWithRelations): boolean => {
    const appointmentDate = new Date(appointment.appointment_date)
    const currentDate = new Date()
    const diffTime = appointmentDate.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 2
  }

  const formatCarIssue = (issue: string): string => {
    return issue.charAt(0).toUpperCase() + issue.slice(1).replace(/_/g, ' ')
  }

  const handleStartAppointment = (appointment: AppointmentWithRelations) => {
    // Implementation for starting appointment
    console.log('Starting appointment:', appointment.id)
  }

  const handleCancelConfirmedAppointment = async (appointment: AppointmentWithRelations, quotePrice: number) => {
    // Implementation for canceling confirmed appointment
    console.log('Canceling confirmed appointment:', appointment.id)
  }

  const handleEditAppointment = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment)
    setIsEditing(true)
  }

  const handleSubmitEdit = async (e: any) => {
    e.preventDefault()
    // Implementation for submitting edit
    console.log('Submitting edit for appointment:', selectedAppointment?.id)
  }

  const handleCancelQuote = async (appointmentId: string) => {
    // Implementation for canceling quote
    console.log('Canceling quote for appointment:', appointmentId)
  }

  const handleSubmitQuote = async (appointmentId: string, price: number, eta: string, notes?: string): Promise<void> => {
    // Implementation for submitting quote
    console.log('Submitting quote:', { appointmentId, price, eta, notes })
  }

  // Filtered appointments
  const filteredUpcomingAppointments = useMemo(() => {
    const filtered = upcomingAppointments.filter(shouldShowInUpcoming)
    return searchAppointments(filtered, searchQuery)
  }, [upcomingAppointments, searchQuery])

  const filteredAvailableAppointments = useMemo(() => {
    return searchAppointments(availableAppointments, searchQuery)
  }, [availableAppointments, searchQuery])

  // Loading state
  if (isAuthLoading || isMechanicLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {isAuthLoading ? "Loading your dashboard..." : "Loading your mechanic profile..."}
            </h1>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-4">
              {safeText(error)}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main dashboard content
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notification && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">
              {safeText(notification.message)}
            </p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mechanic Dashboard
              </h1>
              {mechanicProfile && (
                <p className="text-gray-600 mt-1">
                  Welcome back, {safeText(mechanicProfile.first_name)}!
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/book-appointment')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Find appointments
              </button>
              <button
                onClick={copyLinkToClipboard}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Refer a friend
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upcoming Appointments
              </h2>
              <p className="text-gray-600 text-sm">
                Your quoted & confirmed jobs
              </p>
            </div>
          </div>

          {isAppointmentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading appointments...</p>
            </div>
          ) : filteredUpcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">
                {searchQuery ? 'No Appointments Found' : 'No Upcoming Appointments'}
              </p>
              <p className="text-gray-500 text-sm">
                {searchQuery 
                  ? `No upcoming appointments match "${safeText(searchQuery)}". Try a different search term.`
                  : 'You haven\'t quoted any appointments yet. New appointments will appear here when you submit a quote.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Pagination controls */}
              {filteredUpcomingAppointments.length > 1 && (
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={navigateToPreviousUpcoming}
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={navigateToNextUpcoming}
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Appointment Card */}
              {filteredUpcomingAppointments[currentUpcomingIndex] && (
                <div className="border rounded-lg p-4">
                  {(() => {
                    const appointment = filteredUpcomingAppointments[currentUpcomingIndex];
                    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
                    const isSelected = appointment.selected_mechanic_id === mechanicId;
                    const isEditing = selectedAppointment?.id === appointment.id;
                    const isConfirmed = appointment.payment_status === 'paid' || appointment.status === 'confirmed';
                    
                    return (
                      <>
                        {/* Card Header with Price and Status */}
                        <div className="flex justify-between items-start mb-4">
                          {/* Price Quote */}
                          {myQuote && (
                            <div className="text-lg font-semibold text-green-600">
                              {formatPrice(myQuote.price)}
                            </div>
                          )}
                          
                          {/* Status and ETA */}
                          <div className="text-right">
                            {appointment.status === 'cancelled' ? (
                              <div className="text-red-600 font-medium">
                                ❌ Cancelled
                              </div>
                            ) : isConfirmed ? (
                              <div className="text-green-600 font-medium">
                                ✓ Confirmed
                              </div>
                            ) : isSelected ? (
                              <div className="text-blue-600 font-medium">
                                ✓ Customer selected you
                              </div>
                            ) : (
                              <div className="text-yellow-600 font-medium">
                                ⏳ Pending
                              </div>
                            )}
                            
                            {myQuote?.eta && (
                              <div className="text-sm text-gray-600">
                                ETA: {new Date(myQuote.eta).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Vehicle Details */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Vehicle Information</h4>
                          
                          {/* Year, Make, Model Row */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {appointment.vehicles?.year && (
                              <span className="text-sm text-gray-600">
                                {safeText(appointment.vehicles.year)}
                              </span>
                            )}
                            {appointment.vehicles?.make && (
                              <span className="text-sm text-gray-600">
                                {safeText(appointment.vehicles.make)}
                              </span>
                            )}
                            {appointment.vehicles?.model && (
                              <span className="text-sm text-gray-600">
                                {safeText(appointment.vehicles.model)}
                              </span>
                            )}
                          </div>
                          
                          {/* VIN and Mileage Row */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {appointment.vehicles?.vin && (
                              <span>
                                VIN: {safeText(appointment.vehicles.vin)}
                              </span>
                            )}
                            {appointment.vehicles?.mileage && (
                              <span>
                                {appointment.vehicles.mileage.toLocaleString()} miles
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location and Date */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              📍 {safeText(appointment.location || "Location not specified")}
                            </div>
                            <div className="text-sm text-gray-600">
                              📅 {formatDate(appointment.appointment_date)}
                            </div>
                          </div>
                        </div>

                        {/* Issue Description */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Issue Description</h4>
                          <p className="text-sm text-gray-700">
                            {safeText(appointment.issue_description || "No description provided")}
                          </p>
                        </div>

                        {/* Selected Services */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Selected Services</h4>
                          {(appointment.selected_services && appointment.selected_services.length > 0) ? (
                            <div className="flex flex-wrap gap-2">
                              {appointment.selected_services.map((service: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {safeText(service)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">None Selected</p>
                          )}
                        </div>

                        {/* Car Issues */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Car Issues</h4>
                          {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {appointment.selected_car_issues.map((issue: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {safeText(issue)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No car issues selected</p>
                          )}
                        </div>

                        {/* Car Status */}
                        {appointment.car_runs !== null && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">
                              Car Status
                            </h4>
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                appointment.car_runs ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {appointment.car_runs ? "Car is running" : "Car is not running"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-6 flex space-x-3">
                          {appointment.status === 'cancelled' ? (
                            <div className="text-red-600 font-medium">
                              Appointment Cancelled
                            </div>
                          ) : isConfirmed ? (
                            <>
                              {isFromSchedule ? (
                                <>
                                  {isWithinTwoDays(appointment) ? (
                                    <>
                                      <button
                                        onClick={() => handleScheduleEdit(appointment)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleScheduleCancel(appointment)}
                                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <div className="text-gray-500 font-medium">
                                      View-only (past 2-day limit)
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartAppointment(appointment)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                  >
                                    Start
                                  </button>
                                  <button
                                    onClick={() => handleCancelConfirmedAppointment(appointment, myQuote?.price || 0)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSubmitEdit}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                  >
                                    Update Quote
                                  </button>
                                  <button
                                    onClick={() => setIsEditing(false)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditAppointment(appointment)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  {appointment.payment_status !== 'paid' && (
                                    <button
                                      onClick={() => handleCancelQuote(appointment.id)}
                                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Pagination Dots */}
              {filteredUpcomingAppointments.length > 1 && (
                <div className="flex justify-center space-x-2 mt-4">
                  {filteredUpcomingAppointments.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentUpcomingIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentUpcomingIndex ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Available Appointments Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Available Appointments
              </h2>
              <p className="text-gray-600 text-sm">
                New appointments to quote
              </p>
            </div>
          </div>

          {isAppointmentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading appointments...</p>
            </div>
          ) : filteredAvailableAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">
                {searchQuery ? 'No Appointments Found' : 'No Available Appointments'}
              </p>
              <p className="text-gray-500 text-sm">
                {searchQuery 
                  ? `No appointments match "${safeText(searchQuery)}". Try a different search term.`
                  : 'There are no pending appointments at this time. Check back later for new requests.'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Refresh
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Navigation buttons for multiple appointments */}
              {filteredAvailableAppointments.length > 1 && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={() => setCurrentAvailableIndex(prev => prev === 0 ? filteredAvailableAppointments.length - 1 : prev - 1)}
                      className="p-2 text-gray-600 hover:text-gray-800"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setCurrentAvailableIndex(prev => (prev + 1) % filteredAvailableAppointments.length)}
                      className="p-2 text-gray-600 hover:text-gray-800"
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}

              {/* Current appointment details */}
              {filteredAvailableAppointments[currentAvailableIndex] && (
                <div className="border rounded-lg p-4">
                  {/* Editing Protection Warning */}
                  {filteredAvailableAppointments[currentAvailableIndex].is_being_edited && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">⚠️</span>
                        <span className="text-yellow-800 text-sm">
                          Customer is currently editing this appointment
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Edited After Quotes Warning */}
                  {filteredAvailableAppointments[currentAvailableIndex].edited_after_quotes && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center">
                        <span className="text-blue-600 mr-2">🔄</span>
                        <div>
                          <div className="text-blue-800 font-medium text-sm">
                            Appointment Updated
                          </div>
                          <div className="text-blue-700 text-sm">
                            Customer modified details. Previous quotes removed.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recently Updated Badge */}
                  {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && 
                   new Date().getTime() - new Date(filteredAvailableAppointments[currentAvailableIndex].last_edited_at).getTime() < 3600000 && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Recently Updated
                      </span>
                    </div>
                  )}

                  {/* Location and Date */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        📍 {safeText(filteredAvailableAppointments[currentAvailableIndex].location || "Location not specified")}
                      </div>
                      <div className="text-sm text-gray-600">
                        📅 {formatDate(filteredAvailableAppointments[currentAvailableIndex].appointment_date)}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Vehicle Information</h4>
                    {/* Year, Make, Model Row */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(() => {
                        const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                        console.log('🎯 Rendering vehicle info for appointment:', {
                          appointmentId: filteredAvailableAppointments[currentAvailableIndex]?.id,
                          hasVehicle: !!vehicle,
                          vehicleData: vehicle
                        });
                        
                        if (!vehicle) {
                          return <div>Vehicle information not available</div>;
                        }
                        
                        const hasBasicInfo = vehicle.year || vehicle.make || vehicle.model;
                        if (!hasBasicInfo) {
                          return <div>No vehicle details available</div>;
                        }
                        
                        return (
                          <>
                            {vehicle.year && (
                              <span className="text-sm text-gray-600">
                                {safeText(vehicle.year)}
                              </span>
                            )}
                            {vehicle.make && (
                              <span className="text-sm text-gray-600">
                                {safeText(vehicle.make)}
                              </span>
                            )}
                            {vehicle.model && (
                              <span className="text-sm text-gray-600">
                                {safeText(vehicle.model)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* VIN and Mileage Row */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {(() => {
                        const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                        if (!vehicle) return null;
                        
                        return (
                          <>
                            {vehicle.vin && (
                              <span>
                                VIN: {safeText(vehicle.vin)}
                              </span>
                            )}
                            {vehicle.mileage && (
                              <span>
                                {vehicle.mileage.toLocaleString()} miles
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Selected Services */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Services</h4>
                    {filteredAvailableAppointments[currentAvailableIndex].selected_services && 
                     filteredAvailableAppointments[currentAvailableIndex].selected_services.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {filteredAvailableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {safeText(service)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No services selected</p>
                    )}
                  </div>

                  {/* Car Issues */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Car Issues</h4>
                    {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues && 
                     filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.map((issue: string, index: number) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {formatCarIssue(issue)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No car issues selected</p>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Issue Description</h4>
                    <p className="text-sm text-gray-700">
                      {safeText(filteredAvailableAppointments[currentAvailableIndex].issue_description || "No description provided")}
                    </p>
                  </div>

                  {/* Last Edited Info */}
                  {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && (
                    <div className="mb-4 text-sm text-gray-500">
                      Edited {formatRelativeTime(filteredAvailableAppointments[currentAvailableIndex].last_edited_at)}
                    </div>
                  )}

                  {/* Quote Form */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Submit Quote</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price ($)
                        </label>
                        <input
                          type="number"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your quote amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          onClick={() => handleSubmitQuote(
                            filteredAvailableAppointments[currentAvailableIndex].id,
                            parseFloat(priceInput),
                            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                          )}
                          disabled={!priceInput || isProcessing}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? "Submitting..." : "Submit Quote"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination Dots */}
              {filteredAvailableAppointments.length > 1 && (
                <div className="flex justify-center space-x-2 mt-4">
                  {filteredAvailableAppointments.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAvailableIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentAvailableIndex ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
