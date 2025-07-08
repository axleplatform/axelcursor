"use client"

import type React from "react"
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
      .replace(/{/g, "&#123;")  // Add this for opening brace
      .replace(/}/g, "&#125;")  // Add this for closing brace
  }

  const { toast } = useToast()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<MechanicProfile | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isMechanicLoading, setIsMechanicLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<AppointmentWithRelations[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithRelations[]>([])
  const [skippedAppointments, setSkippedAppointments] = useState<MechanicSkip[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState<boolean>(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [currentUpcomingIndex, setCurrentUpcomingIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")

  // Appointment visibility logic state
  const [restoredToday, setRestoredToday] = useState<Set<string>>(new Set())
  // Helper functions for appointment visibility logic
  const isPastETA = (appointment: AppointmentWithRelations): boolean => {
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
    if (!myQuote?.eta) return false

    const etaDate = new Date(myQuote.eta)
    const currentDate = new Date()

    // Set both dates to midnight for day boundary comparison
    const etaMidnight = new Date(etaDate.getFullYear(), etaDate.getMonth(), etaDate.getDate())
    const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

    return currentMidnight > etaMidnight
  }

  const isRestoredToday = (appointmentId: string): boolean => {
    return restoredToday.has(appointmentId)
  }

  const shouldShowInUpcoming = (appointment: AppointmentWithRelations): boolean => {
    // If it's restored today, always show it
    if (isRestoredToday(appointment.id)) {
      return true
    }

    // If it's past ETA, don't show it in upcoming
    if (isPastETA(appointment)) {
      return false
    }

    // For cancelled appointments, only show if they've been restored today
    if (appointment.status === "cancelled") {
      return isRestoredToday(appointment.id)
    }

    // Don't show edited appointments in upcoming - they should be in available
    if (appointment.edited_after_quotes) {
      return false
    }

    // Otherwise, show it normally
    return true
  }

  const handleRestoreAppointment = (appointment: AppointmentWithRelations) => {
    setRestoredToday((prev) => new Set([...prev, appointment.id]))
  }

  const handleToggleCancelledAppointment = (appointment: AppointmentWithRelations) => {
    if (appointment.status === "cancelled") {
      if (isRestoredToday(appointment.id)) {
        // Remove from restored list (hide it)
        setRestoredToday((prev) => {
          const newSet = new Set(prev)
          newSet.delete(appointment.id)
          return newSet
        })
        toast({
          title: "Appointment Hidden",
          description: "Cancelled appointment has been hidden from upcoming appointments.",
        })
      } else {
        // Add to restored list (show it)
        handleRestoreAppointment(appointment)
        toast({
          title: "Appointment Restored",
          description: "Cancelled appointment has been restored to upcoming appointments.",
        })
      }
    }
  }

  // Schedule-specific handlers
  const handleScheduleCancel = (appointment: AppointmentWithRelations) => {
    // First navigate to the appointment to show it to the user
    navigateToAppointmentFromSchedule(appointment)

    // Then open the cancel modal
    setShowScheduleCancelModal(true)
  }

  const handleScheduleEdit = (appointment: AppointmentWithRelations) => {
    // First navigate to the appointment to show it to the user
    navigateToAppointmentFromSchedule(appointment)

    // Initialize form fields with current appointment data
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
    if (myQuote) {
      setPriceInput(myQuote.price.toString())

      // Parse ETA date and time
      const etaDate = new Date(myQuote.eta)
      const year = etaDate.getFullYear()
      const month = pad(etaDate.getMonth() + 1)
      const day = pad(etaDate.getDate())
      const hours = pad(etaDate.getHours())
      const minutes = pad(etaDate.getMinutes())

      setSelectedDate(`${year}-${month}-${day}`)
      setSelectedTime(`${hours}:${minutes}`)
      setNotes(myQuote.notes || "")
    }

    // Then open the edit modal
    setShowScheduleEditModal(true)
  }

  // Helper function to navigate to appointment from schedule
  const navigateToAppointmentFromSchedule = (appointment: AppointmentWithRelations) => {
    // Set flag to indicate this appointment was accessed from schedule
    setIsFromSchedule(true)

    // Check if this is a past-ETA appointment that needs to be restored
    if (isPastETA(appointment) && !isRestoredToday(appointment.id)) {
      handleRestoreAppointment(appointment)
      toast({
        title: "Appointment Restored",
        description: "This appointment has been restored to your upcoming appointments for today.",
      })
    }

    // Find the appointment in available appointments
    const availableIndex = availableAppointments.findIndex((apt) => apt.id === appointment.id)
    if (availableIndex !== -1) {
      setCurrentAvailableIndex(availableIndex)

      // For mobile, scroll to available appointments section
      if (isMobile) {
        const availableSection = document.querySelector('[data-section="available-appointments"]')
        if (availableSection) {
          availableSection.scrollIntoView({ behavior: "smooth", block: "start" })

          // Add visual feedback
          availableSection.classList.add("ring-2", "ring-[#294a46]", "ring-opacity-50")
          setTimeout(() => {
            availableSection.classList.remove("ring-2", "ring-[#294a46]", "ring-opacity-50")
          }, 2000)

          toast({
            title: "Appointment Found",
            description: "Scrolled to available appointments section",
          })
        }
      }
      return
    }

    // Find the appointment in the FILTERED upcoming appointments (not the original array)
    const filteredUpcomingIndex = filteredUpcomingAppointments.findIndex((apt) => apt.id === appointment.id)
    if (filteredUpcomingIndex !== -1) {
      // Set the clicked appointment as the active one in upcoming appointments
      setCurrentUpcomingIndex(filteredUpcomingIndex)

      // Enhanced scrolling for mobile devices
      const upcomingSection = document.querySelector('[data-section="upcoming-appointments"]')
      if (upcomingSection) {
        if (isMobile) {
          // For mobile, scroll with better positioning and add visual feedback
          upcomingSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })

          // Add a brief highlight effect to the section
          upcomingSection.classList.add("ring-2", "ring-[#294a46]", "ring-opacity-50")
          setTimeout(() => {
            upcomingSection.classList.remove("ring-2", "ring-[#294a46]", "ring-opacity-50")
          }, 2000)

          toast({
            title: "Appointment Found",
            description: "Scrolled to upcoming appointments section",
          })
        } else {
          // Desktop behavior - smooth scroll
          upcomingSection.scrollIntoView({ behavior: "smooth" })
        }
      }
      return
    }

    // If not found in filtered appointments, it might be filtered out
    // Try to find it in the original upcoming appointments and restore it if needed
    const originalUpcomingIndex = upcomingAppointments.findIndex((apt) => apt.id === appointment.id)
    if (originalUpcomingIndex !== -1) {
      // This appointment exists but is filtered out - restore it and set as current
      handleRestoreAppointment(appointment)
      // After restoration, it should appear in filtered appointments
      // We'll need to wait for the next render cycle to find the correct index
      setTimeout(() => {
        const newFilteredIndex = filteredUpcomingAppointments.findIndex((apt) => apt.id === appointment.id)
        if (newFilteredIndex !== -1) {
          setCurrentUpcomingIndex(newFilteredIndex)

          // Scroll to the section after restoration
          const upcomingSection = document.querySelector('[data-section="upcoming-appointments"]')
          if (upcomingSection && isMobile) {
            upcomingSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })

            // Add visual feedback
            upcomingSection.classList.add("ring-2", "ring-[#294a46]", "ring-opacity-50")
            setTimeout(() => {
              upcomingSection.classList.remove("ring-2", "ring-[#294a46]", "ring-opacity-50")
            }, 2000)
          }
        }
      }, 100)

      toast({
        title: "Appointment Restored",
        description: "This appointment has been restored to your upcoming appointments.",
      })
      return
    }
  }

  const handleScheduleCancelSubmit = async () => {
    try {
      const currentAppointment = filteredUpcomingAppointments[currentUpcomingIndex]
      if (!currentAppointment) return

      // Update appointment with cancellation details
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "mechanic",
          cancellation_reason: cancellationReason,
          cancellation_type: cancellationType,
        })
        .eq("id", currentAppointment.id)

      if (error) throw error

      toast({
        title: "Appointment Cancelled",
        description:
          cancellationType === "customer"
            ? "Customer will receive a full refund. A cancellation fee will be charged to the customer."
            : "Customer will receive a full refund. You will be charged a cancellation fee.",
      })

      setShowScheduleCancelModal(false)
      setCancellationReason("")
      setCancellationType("customer")
      setIsFromSchedule(false)
      await fetchInitialAppointments()
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleScheduleEditSubmit = async () => {
    try {
      const currentAppointment = filteredUpcomingAppointments[currentUpcomingIndex]
      if (!currentAppointment) return

      const myQuote = currentAppointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
      if (!myQuote) return

      // Combine date and time
      const [year, month, day] = selectedDate.split("-")
      const [hour, minute] = selectedTime.split(":")
      const etaDateTime = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day),
        Number.parseInt(hour),
        Number.parseInt(minute),
      ).toISOString()

      const { error } = await supabase
        .from("mechanic_quotes")
        .update({
          price: Number.parseFloat(priceInput),
          eta: etaDateTime,
          notes: notes || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", myQuote.id)

      if (error) throw error

      toast({
        title: "Quote Updated",
        description: "Your quote has been updated successfully.",
      })

      setShowScheduleEditModal(false)
      setIsFromSchedule(false)
      await fetchInitialAppointments()
    } catch (error) {
      console.error("Error updating quote:", error)
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Reset restored appointments at midnight
  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timeUntilMidnight = tomorrow.getTime() - now.getTime()

    const timer = setTimeout(() => {
      setRestoredToday(new Set())
    }, timeUntilMidnight)

    return () => clearTimeout(timer)
  }, [])

  // Helper functions for default date/time
  const getDefaultDate = (): string => {
    const today = new Date()
    const currentHour = today.getHours()

    // If current time is past 8 PM, automatically set to next day
    if (currentHour >= 20) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split("T")[0] // Format: YYYY-MM-DD
    }

    return today.toISOString().split("T")[0] // Format: YYYY-MM-DD
  }

  // Helper function to pad numbers
  const pad = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`
  }

  const getDefaultTime = (appointment?: AppointmentWithRelations): string => {
    // If we have an appointment, use the customer's actual requested time
    if (appointment?.appointment_date) {
      try {
        const appointmentDate = new Date(appointment.appointment_date)
        const hours = pad(appointmentDate.getHours())
        const minutes = pad(appointmentDate.getMinutes())
        console.log(
          "🕒 Using customer requested time:",
          `${hours}:${minutes}`,
          "from appointment_date:",
          appointment.appointment_date,
        )
        return `${hours}:${minutes}`
      } catch (error) {
        console.warn("🕒 Error parsing appointment_date, falling back to current time:", error)
      }
    }

    // Fallback to current time (not rounded down - exact current time)
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Ensure it's within business hours (8 AM to 8 PM)
    let defaultHour = currentHour
    let defaultMinute = currentMinute

    if (currentHour < 8) {
      defaultHour = 8 // If before 8 AM, default to 8:00 AM
      defaultMinute = 0
    } else if (currentHour >= 20) {
      defaultHour = 8 // If after 8 PM, default to 8:00 AM next day
      defaultMinute = 0
    }

    const fallbackTime = `${pad(defaultHour)}:${pad(defaultMinute)}`
    console.log("🕒 Using fallback current time:", fallbackTime)
    return fallbackTime
  }

  const [selectedDate, setSelectedDate] = useState(getDefaultDate())
  const [selectedTime, setSelectedTime] = useState(getDefaultTime())
  const [showETAError, setShowETAError] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Add notification state at the top of the component
  const [notification, setNotification] = useState<NotificationState | null>(null)

  // Add new state variables after the existing ones
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [price, setPrice] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  // Add new state variables after the existing ones
  const [startingAppointment, setStartingAppointment] = useState<AppointmentWithRelations | null>(null)
  const [etaMinutes, setEtaMinutes] = useState("30")
  const [isStarting, setIsStarting] = useState(false)

  // Add new state variables after the existing ones
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAppointment, setEditAppointment] = useState<AppointmentWithRelations | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // Refer a Friend modal state
  const [showReferModal, setShowReferModal] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Schedule click tracking state
  const [isFromSchedule, setIsFromSchedule] = useState<boolean>(false)
  const [showScheduleCancelModal, setShowScheduleCancelModal] = useState<boolean>(false)
  const [showScheduleEditModal, setShowScheduleEditModal] = useState<boolean>(false)
  const [cancellationReason, setCancellationReason] = useState<string>("")
  const [cancellationType, setCancellationType] = useState<"customer" | "mechanic">("customer")

  // Helper function to check if appointment is within 2 days (for schedule-accessed appointments)
  const isWithinTwoDays = (appointment: AppointmentWithRelations): boolean => {
    const appointmentDate = new Date(appointment.appointment_date)
    const today = new Date()

    // Set both dates to midnight for accurate day comparison
    const appointmentMidnight = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate(),
    )
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Calculate difference in days
    const diffTime = todayMidnight.getTime() - appointmentMidnight.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Return true if within 2 days (including the appointment day and 2 days after)
    return diffDays >= -1 && diffDays <= 2
  }

  // Update selectedDate and selectedTime when current available appointment changes
  useEffect(() => {
    if (availableAppointments.length > 0 && availableAppointments[currentAvailableIndex]) {
      const currentAppointment = availableAppointments[currentAvailableIndex]
      console.log("🕒 Current appointment changed, updating date/time to customer requested time")
      console.log("🕒 Appointment:", currentAppointment.id, "Date:", currentAppointment.appointment_date)

      // Update date to customer's requested date
      if (currentAppointment.appointment_date) {
        try {
          const appointmentDate = new Date(currentAppointment.appointment_date)
          const dateString = appointmentDate.toISOString().split("T")[0]
          setSelectedDate(dateString)
          console.log("🕒 Set selectedDate to customer requested:", dateString)
        } catch (error) {
          console.warn("🕒 Error parsing appointment date:", error)
          setSelectedDate(getDefaultDate())
        }
      }

      // Update time to customer's requested time
      setSelectedTime(getDefaultTime(currentAppointment))
    }
  }, [currentAvailableIndex, availableAppointments])

  // Ensure currentAvailableIndex is always valid when availableAppointments changes
  useEffect(() => {
    if (availableAppointments.length > 0 && currentAvailableIndex >= availableAppointments.length) {
      setCurrentAvailableIndex(0)
    }
  }, [availableAppointments.length, currentAvailableIndex])

  // Add showNotification function
  const showNotification = (message: string, type: NotificationState["type"] = "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000) // Auto-hide after 5 seconds
  }

  // Copy link to clipboard function
  const copyLinkToClipboard = async () => {
    const landingPageUrl = window.location.origin

    try {
      await navigator.clipboard.writeText(landingPageUrl)
      setIsLinkCopied(true)
      showNotification("Link copied! Thank you for sharing.", "success")

      // Reset the copied state after 2 seconds
      setTimeout(() => setIsLinkCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
      showNotification("Failed to copy link. Please try again.", "error")
    }
  }

  // Comprehensive search function
  const searchAppointments = (appointments: AppointmentWithRelations[], query: string): AppointmentWithRelations[] => {
    if (!query.trim()) return appointments

    const searchTerm = query.toLowerCase().trim()

    return appointments.filter((appointment) => {
      // Create a comprehensive search string from all relevant fields
      const searchableText = [
        // Vehicle info
        safeText(appointment.vehicles?.year?.toString() || ""),
        safeText(appointment.vehicles?.make || ""),
        safeText(appointment.vehicles?.model || ""),
        safeText(appointment.vehicles?.vin || ""),
        safeText(appointment.vehicles?.mileage?.toString() || ""),

        // Appointment details
        safeText(appointment.location || ""),
        safeText(appointment.issue_description || ""),
        appointment.appointment_date ? safeText(new Date(appointment.appointment_date).toLocaleDateString()) : "",
        appointment.appointment_date ? safeText(new Date(appointment.appointment_date).toLocaleTimeString()) : "",

        // Services and issues
        ...(appointment.selected_services || []).map(safeText),
        ...(appointment.selected_car_issues || []).map(safeText),

        // Status and quotes
        safeText(appointment.status || ""),
        safeText(appointment.payment_status || ""),
        appointment.mechanic_quotes?.map((q) => safeText(q.price?.toString() || "")).join(" ") || "",
        appointment.mechanic_quotes?.map((q) => (q.eta ? safeText(new Date(q.eta).toLocaleString()) : "")).join(" ") ||
          "",
        appointment.mechanic_quotes?.map((q) => safeText(q.notes || "")).join(" ") || "",

        // Car status
        appointment.car_runs !== null ? (appointment.car_runs ? "running" : "not running") : "",

        // Quote info
        safeText(appointment.quote?.price?.toString() || ""),
        appointment.quote?.created_at ? safeText(new Date(appointment.quote.created_at).toLocaleString()) : "",
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(searchTerm)
    })
  }

  // Get filtered appointments
  const filteredAvailableAppointments = useMemo(
    () => searchAppointments(availableAppointments, searchQuery),
    [availableAppointments, searchQuery],
  )

  const filteredUpcomingAppointments = useMemo(() => {
    const visibleAppointments = upcomingAppointments.filter(shouldShowInUpcoming)
    // Include cancelled appointments so they appear in the schedule
    return searchAppointments(visibleAppointments, searchQuery)
  }, [upcomingAppointments, searchQuery, restoredToday])

  // Ensure currentUpcomingIndex is always valid when filtered appointments change
  useEffect(() => {
    if (filteredUpcomingAppointments.length > 0 && currentUpcomingIndex >= filteredUpcomingAppointments.length) {
      setCurrentUpcomingIndex(0)
    } else if (filteredUpcomingAppointments.length === 0) {
      setCurrentUpcomingIndex(0)
    }
  }, [filteredUpcomingAppointments.length, currentUpcomingIndex])

  // Clear search function
  const clearSearch = () => {
    setSearchQuery("")
  }

  // Helper function to format price - show whole numbers without .00
  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? `$${price.toFixed(0)}` : `$${price.toFixed(2)}`
  }

  // Generate available dates (next 7 days)
  const getAvailableDates = (): DateOption[] => {
    const dates: DateOption[] = []
    const today = new Date()

    for (let i = 0; i = 0 && newIndex < filteredUpcomingAppointments.length ? newIndex : 0;
  }
  )
  \
      setIsFromSchedule(false) // Reset flag when navigating normally
}
}
\
// Handle appointment click from schedule
const handleScheduleAppointmentClick = (appointment: AppointmentWithRelations) => {
  if (appointment.status === "cancelled") {
    if (!isRestoredToday(appointment.id)) {
      // First click: Restore (show) the appointment, then scroll to it
      handleRestoreAppointment(appointment)
      setTimeout(() => {
        navigateToAppointmentFromSchedule(appointment)
      }, 100) // Wait for state update
    } else {
      // Second click: Hide the appointment, don't navigate anywhere
      handleToggleCancelledAppointment(appointment)
      // No navigation since the appointment is now hidden
    }
    return
  }
  // Use the helper function to navigate to the appointment
  navigateToAppointmentFromSchedule(appointment)
}

// Update handleUpdateQuote function
const handleUpdateQuote = async (appointmentId: string) => {
  try {
    const myQuote = upcomingAppointments
      .find((apt) => apt.id === appointmentId)
      ?.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)

    if (!myQuote) {
      showNotification("Quote not found", "error")
      return
    }

    // Combine date and time
    const [year, month, day] = selectedDate.split("-")
    const [hour, minute] = selectedTime.split(":")
    const etaDateTime = new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day),
      Number.parseInt(hour),
      Number.parseInt(minute),
    ).toISOString()

<<<<<<< HEAD
    const { error } = await supabase
      .from("mechanic_quotes")
      .update({
        price: Number.parseFloat(price),
=======
    // Note: Real-time subscriptions are now handled in the useMechanicAppointments hook
    // This eliminates duplicate subscriptions and improves performance
    
    // Initial setup
    fetchInitialAppointments()

    // Cleanup function for any local resources
    return () => {
      console.log("🧹 Dashboard cleanup")
    }
  }, [mechanicId])

  // Real-time subscription for instant updates
  useEffect(() => {
   if (!mechanicId) return

   console.log('🔄 Setting up real-time subscriptions for mechanic:', mechanicId)
   
   // Subscribe to appointments table changes
   const appointmentsSubscription = supabase
    .channel('appointments-changes')
    .on(
     'postgres_changes',
     {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'appointments'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Appointment change detected:', payload)
      // Refresh appointments when any appointment changes
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to mechanic quotes changes
   const quotesSubscription = supabase
    .channel('quotes-changes')
    .on(
     'postgres_changes',
     {
      event: '*', // Listen to all events
      schema: 'public',
      table: 'mechanic_quotes'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Quote change detected:', payload)
      // Refresh appointments when quotes change
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to mechanic skipped appointments changes
   const skipsSubscription = supabase
    .channel('skips-changes')
    .on(
     'postgres_changes',
     {
      event: '*',
      schema: 'public',
      table: 'mechanic_skipped_appointments'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Skip change detected:', payload)
      // Refresh appointments when skips change
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to appointment updates for editing notifications
   const appointmentUpdatesSubscription = supabase
    .channel('appointment-updates')
    .on(
     'postgres_changes',
     {
      event: 'INSERT', // Listen to new appointment updates
      schema: 'public',
      table: 'appointment_updates'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Appointment update detected:', payload)
      
      // Show notification to mechanic
      toast({
       title: "Appointment Updated",
       description: `Appointment ${payload.new.appointment_id} was updated. Please re-quote if interested.`,
       variant: "default",
      })
      
      // Refresh appointments list
      fetchInitialAppointments()
     }
    )
    .subscribe()

   console.log('✅ Real-time subscriptions established')

   return () => {
    console.log('🔄 Cleaning up real-time subscriptions')
    appointmentsSubscription.unsubscribe()
    quotesSubscription.unsubscribe()
    skipsSubscription.unsubscribe()
    appointmentUpdatesSubscription.unsubscribe()
   }
  }, [mechanicId])

  // Add useEffect to load mechanic profile ONLY after auth is complete
  useEffect(() => {
    // Only run after auth is complete and user is authenticated
    if (isAuthLoading || !userId) {
          return
        }

    const loadMechanicProfile = async () => {
      try {
        console.log('🔄 Loading mechanic profile for user:', userId);
        console.log('🔄 MECHANIC PROFILE LOAD START - Current state:', {
          userId,
          mechanicId: mechanicId,
          mechanicProfile: mechanicProfile,
          isMechanicLoading: isMechanicLoading
        });
        setIsMechanicLoading(true);
        
        const { data: profile, error: profileError } = await supabase
          .from('mechanic_profiles')
          .select('id, user_id, first_name, last_name')
          .eq('user_id', userId)
          .single();

        console.log('🔄 MECHANIC PROFILE DB RESPONSE:', {
          profile: profile,
          error: profileError,
          hasProfile: !!profile,
          profileId: profile?.id,
          profileUserId: profile?.user_id
        });

        if (profileError) {
          console.error('❌ Error loading mechanic profile:', profileError);
          if (profileError.code === 'PGRST116') {
            // No mechanic profile found - redirect to onboarding
            console.log('📝 No mechanic profile found, redirecting to onboarding');
            router.push('/onboarding-mechanic-1');
            return;
          }
          setError('Failed to load mechanic profile');
          return;
        }

        if (!profile) {
          console.error('❌ No mechanic profile found for user:', userId);
          router.push('/onboarding-mechanic-1');
          return;
        }

        console.log('✅ Mechanic profile loaded successfully:', {
          userId: userId,
          mechanicProfileId: profile.id,
          mechanicName: `${profile.first_name} ${profile.last_name}`
        });

        console.log('🎯 SETTING MECHANIC ID TO:', profile.id);
        
        // CRITICAL FIX: Set both state values together
        setMechanicId(profile.id);
        setMechanicProfile(profile);
        
        console.log('🎯 AFTER setState - mechanicId should be:', profile.id);
        
      } catch (error) {
        console.error('❌ Error in loadMechanicProfile:', error);
        setError('Failed to load mechanic profile');
      } finally {
        setIsMechanicLoading(false);
        console.log('🎯 MECHANIC LOADING: Set to false');
      }
    };

    loadMechanicProfile();
  }, [userId, isAuthLoading, router]); // CRITICAL: Add mechanicId dependency if needed for re-runs

  // Debug: Log all data that will be rendered
  useEffect(() => {
    console.log('=== DASHBOARD DATA DEBUG ===');
    console.log('Mechanic Profile:', mechanicProfile);
    console.log('Appointments:', appointments);
    console.log('Available Appointments:', availableAppointments);
    console.log('Notifications:', notifications);
    
    // Check for problematic characters
    const checkForProblematicChars = (obj: any, path: string = '') => {
      if (!obj) return;
      
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string') {
          if (value.includes('&gt;') || value.includes('&lt;')) {
            console.error(`🚨 FOUND PROBLEMATIC CHAR in ${path}.${key}:`, value);
          }
        } else if (typeof value === 'object' && value !== null) {
          checkForProblematicChars(value, `${path}.${key}`);
        }
      });
    };
    
    checkForProblematicChars(mechanicProfile, 'mechanicProfile');
    appointments?.forEach((apt, i) => checkForProblematicChars(apt, `appointments[${i}]`));
    availableAppointments?.forEach((apt, i) => checkForProblematicChars(apt, `availableAppointments[${i}]`));
    notifications?.forEach((notif, i) => checkForProblematicChars(notif, `notifications[${i}]`));
    
    console.log('===========================');
  }, [mechanicProfile, appointments, availableAppointments, notifications]);

  // Add debug function for mechanic profile
  const debugMechanicProfile = async (): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('=== MECHANIC PROFILE DEBUG ===');
    console.log('1. Current auth user ID:', user?.id);
    
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('mechanic_profiles')
      .select('*')
      .eq('user_id', user?.id);
    
    console.log('2. Profile query result:', { profile, error });
    
    if (!profile || profile.length === 0) {
      console.error('❌ NO MECHANIC PROFILE FOUND FOR USER');
      showNotification('No mechanic profile found. Please complete your profile setup.', 'error');
      // Redirect to profile setup
      router.push('/onboarding-mechanic-1');
      return null;
    }
    
    console.log('3. Mechanic profile ID:', profile[0].id);
    console.log('4. Full profile:', profile[0]);
    
    return profile[0];
  };

  // Add function to create mechanic profile if needed
  const createMechanicProfile = async (): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: newProfile, error } = await supabase
      .from('mechanic_profiles')
      .insert({
        user_id: user?.id,
        first_name: user?.user_metadata?.first_name || 'Unknown',
        last_name: user?.user_metadata?.last_name || 'Mechanic',
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create mechanic profile:', error);
      return null;
    }
    
    console.log('Created new mechanic profile:', newProfile);
    return newProfile;
  };

  // Update handleSubmitQuote with debugging
  const handleSubmitQuote = async (appointmentId: string, price: number, eta: string, notes?: string): Promise<void> => {
    try {
      setIsProcessing(true);
      console.log('🎯 === QUOTE SUBMISSION DEBUG ===');
      console.log('1. Starting quote submission with:', {
        appointmentId,
        price,
        eta,
        notes,
        mechanicId,
        mechanicIdType: typeof mechanicId,
        isMechanicLoading
      });

      // CRITICAL: Check if mechanicId is available
      if (!mechanicId) {
        console.error('❌ CRITICAL: mechanicId is undefined!', {
          mechanicId,
          mechanicProfile,
          isMechanicLoading,
          isAuthLoading
        });
        
        if (isMechanicLoading) {
            toast({
            title: "Please wait",
            description: "Loading your mechanic profile...",
              variant: "destructive",
          });
          return;
        } else {
          toast({
            title: "Profile Error",
            description: "Unable to load your mechanic profile. Please refresh the page.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('2. mechanicId validation passed:', mechanicId);

      // Validate ETA selection
      if (!selectedDate || !selectedTime) {
        setShowETAError(true);
        toast({
          title: "Error",
          description: "Please select both date and time for when you can show up.",
          variant: "destructive",
        });
        return;
      }

      // Combine date and time
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const etaDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
      
      console.log('3. Creating quote with validated mechanicId:', {
        mechanic_id: mechanicId,
        appointment_id: appointmentId,
        price,
>>>>>>> main
        eta: etaDateTime,
        notes: notes || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", myQuote.id)

    if (error) {
      throw error
    }

    showNotification("Quote updated successfully", "info")
    await fetchInitialAppointments()
    setSelectedAppointment(null)
    // Reset form
    setPrice("")
    setSelectedDate("")
    setSelectedTime("")
    setNotes("")
  } catch (error) {
    console.error("Error updating quote:", error)
    showNotification("Failed to update quote", "error")
  }
}

// Add handleCancelQuote function after handleUpdateQuote
const handleCancelQuote = async (appointmentId: string) => {
  console.log("=== QUOTE CANCELLATION DEBUG ===")
  console.log("1. Starting cancellation with:", {
    appointmentId,
    mechanicId,
    timestamp: new Date().toISOString(),
  })

  try {
    // Get the appointment and quote details
    const appointment = upcomingAppointments.find((apt) => apt.id === appointmentId)
    const myQuote = appointment?.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)

    console.log("2. Found appointment and quote:", {
      appointment,
      myQuote,
      quoteId: myQuote?.id,
    })

    if (!appointment || !myQuote) {
      console.error("3. Quote not found:", { appointment, myQuote })
      showNotification("Quote not found", "error")
      return
    }

    // Check if appointment is already cancelled
    if (appointment.status === "cancelled") {
      console.warn("4. Appointment is already cancelled:", appointment.id)
      showNotification("This appointment has already been cancelled", "error")
      return
    }

    // Check if payment has been made
    if (appointment.payment_status === "paid") {
      console.log("5. Payment already made, cannot cancel")
      showNotification("Cannot cancel quote after payment has been made", "error")
      return
    }

    // Show confirmation dialog
    if (!window.confirm("Are you sure you want to cancel this quote? This action cannot be undone.")) {
      console.log("6. User cancelled the operation")
      return
    }

    // Verify quote exists before delete
    console.log("7. Checking if quote exists before delete...")
    const { data: checkBefore, error: checkError } = await supabase
      .from("mechanic_quotes")
      .select("*")
      .eq("id", myQuote.id)

    console.log("8. Pre-delete check:", {
      quoteExists: checkBefore?.length > 0,
      checkBefore,
      checkError,
      quoteStructure: checkBefore?.[0] ? Object.keys(checkBefore[0]) : [],
    })

    if (checkError) {
      console.error("9. Error checking quote:", checkError)
      throw checkError
    }

    if (!checkBefore || checkBefore.length === 0) {
      console.error("10. Quote not found in database:", myQuote.id)
      showNotification("Quote not found in database", "error")
      return
    }

    // First, update the appointment to remove the quote reference and mark as cancelled
    console.log("11. Updating appointment to remove quote reference and mark as cancelled...")
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        selected_quote_id: null,
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "mechanic",
      })
      .eq("id", appointmentId)
      .eq("selected_quote_id", myQuote.id)

    if (updateError) {
      console.error("12. Error updating appointment:", updateError)
      throw new Error(`Failed to update appointment: ${updateError.message}`)
    }

    console.log("13. Appointment updated successfully")

    // Now delete the quote
    console.log("14. Attempting to delete quote...")
    const { data: deletedData, error: deleteError } = await supabase
      .from("mechanic_quotes")
      .delete()
      .eq("id", myQuote.id)
      .select()

    console.log("15. Delete response:", {
      deletedData,
      deleteError,
      deletedCount: deletedData?.length,
      conditionsUsed: {
        id: myQuote.id,
      },
    })

    if (deleteError) {
      console.error("16. Delete error:", deleteError)
      throw deleteError
    }

    if (!deletedData || deletedData.length === 0) {
      console.error("17. No records deleted!")
      showNotification("Failed to delete quote - no matching record found", "error")
      return
    }

    // Verify quote is gone after delete
    console.log("18. Verifying quote is deleted...")
    const { data: checkAfter, error: afterError } = await supabase
      .from("mechanic_quotes")
      .select("*")
      .eq("id", myQuote.id)

    console.log("19. Post-delete verification:", {
      stillExists: checkAfter?.length > 0,
      checkAfter,
      afterError,
    })

    if (checkAfter && checkAfter.length > 0) {
      console.error("20. Quote still exists after delete!")
      showNotification("Failed to delete quote - please try again", "error")
      return
    }

    console.log("21. Delete successful, updating UI...")
    // Update UI state
    setUpcomingAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId))

    // Reset form state
    setSelectedAppointment(null)
    setPrice("")
    setSelectedDate(getDefaultDate())
    setSelectedTime(getDefaultTime())
    setNotes("")

    showNotification("Quote cancelled successfully", "success")
  } catch (error) {
    console.error("22. Error in handleCancelQuote:", error)
    showNotification("Failed to cancel quote", "error")
  }
}

// Add new handler functions before the return statement
const handleStartAppointment = (appointment: AppointmentWithRelations) => {
  setStartingAppointment(appointment)
}

const confirmStartAppointment = async () => {
  if (!startingAppointment) return

  setIsStarting(true)
  try {
    // Update appointment status to 'in_progress'
    const { error } = await supabase
      .from("appointments")
      .update({
        status: "in_progress",
        mechanic_eta: etaMinutes,
        started_at: new Date().toISOString(),
      })
      .eq("id", startingAppointment.id)

    if (error) throw error

    // Note: Customer notification system will be implemented in future update
    showNotification(`Job started! ETA: ${etaMinutes} minutes.`, "success")

    // Refresh appointments
    await fetchInitialAppointments()

    setStartingAppointment(null)
    setEtaMinutes("30")
  } catch (error) {
    console.error("Error starting appointment:", error)
    showNotification("Failed to start appointment", "error")
  } finally {
    setIsStarting(false)
  }
}

const handleCancelConfirmedAppointment = async (appointment: AppointmentWithRelations, quotePrice: number) => {
  const cancellationFee = (quotePrice * 0.05).toFixed(2)

  console.log("=== CANCELLATION DEBUG ===")
  console.log("1. Starting cancellation process:", {
    appointmentId: appointment.id,
    mechanicId,
    quotePrice,
    cancellationFee,
    timestamp: new Date().toISOString(),
  })

  const confirmed = window.confirm(
    `Canceling a confirmed appointment will incur a 5% cancellation fee of $${cancellationFee}.\n` +
      `You will be charged the full price if there is a no-show, unless you cancel the appointment.\n\n` +
      `Are you sure you want to cancel?`,
  )

  if (!confirmed) {
    console.log("2. User cancelled the operation")
    return
  }

  try {
    console.log("3. User confirmed cancellation, proceeding with database operations")

    // Verify appointment exists and is in correct state
    const { data: appointmentCheck, error: checkError } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", appointment.id)
      .single()

    if (checkError) {
      console.error("4. Error checking appointment:", checkError)
      throw new Error(`Failed to verify appointment: ${checkError.message}`)
    }

    if (!appointmentCheck) {
      console.error("5. Appointment not found:", appointment.id)
      throw new Error("Appointment not found")
    }

    console.log("6. Appointment verification successful:", appointmentCheck)

    // Verify appointment is in a cancellable state
    if (appointmentCheck.status !== "confirmed" && appointmentCheck.status !== "in_progress") {
      console.error("7. Invalid appointment status for cancellation:", appointmentCheck.status)
      throw new Error(`Cannot cancel appointment in ${appointmentCheck.status} status`)
    }

    // Try to log the cancellation
    try {
      console.log("8. Attempting to log cancellation with fee...")
      const { error: logError } = await supabase.from("appointment_cancellations").insert({
        appointment_id: appointment.id,
        mechanic_id: mechanicId,
        cancellation_fee: cancellationFee,
        reason: "mechanic_cancelled_confirmed",
        created_at: new Date().toISOString(),
      })

      if (logError) {
        console.warn("9. Warning: Could not log cancellation:", logError)
        // Don't throw error, just log the warning
      } else {
        console.log("10. Cancellation logged successfully")
      }
    } catch (logError) {
      console.warn("11. Warning: Failed to log cancellation:", logError)
      // Continue with the cancellation process even if logging fails
    }

    // Update appointment status with cancellation fee
    console.log("12. Starting appointment update process...")

    // Define baseUpdateData
    const baseUpdateData = {
      status: "cancelled",
      cancelled_by: "mechanic",
      cancellation_fee: cancellationFee,
    }

    // Try to update with cancelled_at
    try {
      console.log("13. Attempting update with cancelled_at...")
      const { data: updateWithTimestamp, error: updateError } = await supabase
        .from("appointments")
        .update({
          ...baseUpdateData,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", appointment.id)
        .select()

      if (updateError) {
        console.warn("14. Warning: Could not update with cancelled_at:", updateError)
        // Try again without cancelled_at
        console.log("15. Retrying update without cancelled_at...")
        const { data: updateWithoutTimestamp, error: retryError } = await supabase
          .from("appointments")
          .update(baseUpdateData)
          .eq("id", appointment.id)
          .select()

        if (retryError) {
          console.error("16. Error updating appointment status:", retryError)
          throw new Error(`Failed to update appointment: ${retryError.message}`)
        }

        console.log("17. Appointment status updated successfully (without cancelled_at):", updateWithoutTimestamp)
      } else {
        console.log("18. Appointment status updated successfully (with cancelled_at):", updateWithTimestamp)
      }
    } catch (error) {
      console.error("19. Error in update process:", error)
      throw error
    }

    // Remove from UI
    setUpcomingAppointments((prev) => prev.filter((apt) => apt.id !== appointment.id))

    showNotification(
      `Appointment cancelled. A $${cancellationFee} cancellation fee will be deducted from your account.`,
      "info",
    )
  } catch (error) {
    console.error("20. Error in cancellation process:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    showNotification(`Failed to cancel appointment: ${errorMessage}`, "error")
  }
}

// Add handleEditAppointment function
const handleEditAppointment = (appointment: AppointmentWithRelations) => {
  const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)

  if (!myQuote) {
    showNotification("No quote found for this appointment", "error")
    return
  }

  if (appointment.selected_mechanic_id === mechanicId) {
    showNotification("Cannot edit quote after being selected by customer", "error")
    return
  }

  if (appointment.payment_status === "paid") {
    showNotification("Cannot edit quote after payment has been made", "error")
    return
  }

  // Set the edit state
  setEditAppointment(appointment)
  setEditPrice(myQuote.price.toString())
  const quoteDate = new Date(myQuote.eta)
  setEditDate(quoteDate.toISOString().split("T")[0])
  setEditTime(quoteDate.toTimeString().slice(0, 5))
  setEditNotes(myQuote.notes || "")
  setShowEditModal(true)
}

// Add handleSubmitEdit function
const handleSubmitEdit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!editAppointment || !mechanicId) {
    showNotification("Invalid appointment or mechanic ID", "error")
    return
  }

  try {
    setIsProcessing(true)

    const myQuote = editAppointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
    if (!myQuote) {
      showNotification("Quote not found", "error")
      return
    }

    // Combine date and time
    const [year, month, day] = editDate.split("-")
    const [hour, minute] = editTime.split(":")
    const etaDateTime = new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day),
      Number.parseInt(hour),
      Number.parseInt(minute),
    ).toISOString()

    // Update the quote
    const { error } = await supabase
      .from("mechanic_quotes")
      .update({
        price: Number.parseFloat(editPrice),
        eta: etaDateTime,
        notes: editNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", myQuote.id)

    if (error) {
      throw error
    }

    showNotification("Quote updated successfully", "success")
    setShowEditModal(false)
    await fetchInitialAppointments()
  } catch (error) {
    console.error("Error updating quote:", error)
    showNotification("Failed to update quote", "error")
  } finally {
    setIsProcessing(false)
  }
}

// Loading state - show loading while auth OR mechanic profile is loading
if (isAuthLoading || isMechanicLoading) {
  return (
      

        
          
            
              
            
            
              {isAuthLoading ? \"Loading your dashboard..." : \"Loading your mechanic profile..."}
  \
            
          
        

        
      
    )
}

// Error state
if (error) {
  return (
      

        
          
            
              
            
            
              Authentication
  Error
  \
  safeText(error)

  Return
  to
  Login
  \
            
          
        

        
      
    )
}

// Main dashboard content
return (
    

      
        {notification && (\
\
{
  safeText(notification.message)
}

)}

        \
          
            
              
                Mechanic Dashboard

{
  mechanicProfile && 
                    \
  Welcome
  back, {safeText(mechanicProfile.first_name)}!
  \
}

Find
appointments
\
                    
                    
                      
                    
                  
                
                
                  Refer a friend
                
                
                  
                
              
            
          
        
      

      
        
          
            
              
                Upcoming Appointments
              
              
                Your quoted & confirmed jobs

{
  ;(() => {
    console.log("🎯 UPCOMING APPOINTMENTS RENDER DEBUG:", {
      isAppointmentsLoading,
      upcomingAppointmentsLength: upcomingAppointments.length,
      filteredUpcomingLength: filteredUpcomingAppointments.length,
      searchQuery,
      willShowCards: !isAppointmentsLoading && filteredUpcomingAppointments.length > 0,
    })
    return null
  })()
}
{isAppointmentsLoading ? (
              
                
                  
                
              
            ) : filteredUpcomingAppointments.length === 0 ? (
              
                
                  
                
                
                  {searchQuery ? \'No Appointments Found' : \'No Upcoming Appointments'}\searchQuery 
                    ? `No upcoming appointments match "${safeText(searchQuery)}". Try a different search term.`
                    : 'You haven\'t quoted any appointments yet. New appointments will appear here when you submit a quote.'searchQuery && (
                  
                    Clear Search\
                  
                )
              
            ) : (\(() => {
                  console.log('🎯 RENDERING UPCOMING APPOINTMENT CARDS:', upcomingAppointments.length);
                  return null;
                })()filteredUpcomingAppointments.length > 1 && (
                  <>
                    
                      
                        
                          
                        
                      
                    
                    
                      
                        
                          
                        
                      
                    
                  </>
                )
                {filteredUpcomingAppointments[currentUpcomingIndex] && (
                  
                    {(() => {\
                      const appointment = filteredUpcomingAppointments[currentUpcomingIndex];\
                      const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
                      const isSelected = appointment.selected_mechanic_id === mechanicId;
                      const isEditing = selectedAppointment?.id === appointment.id;
                      const isConfirmed = appointment.payment_status === 'paid' || appointment.status === 'confirmed';
                      
                      return (
                        <>
                          {/* Card Header with Price and Status */}
                          
                            {/* Price Quote */}
                            {myQuote && (
                              
                                {formatPrice(myQuote.price)}\
                              
                            )}
                            
                            {/* Status and ETA */}
                            
                              {appointment.status === 'cancelled' ? (
                                
                                  
                                    ❌ Cancelled\
                                  
                                  
                                    
                                      
                                    
                                    
                                      ETA: {new Date(myQuote?.eta || '').toLocaleString()}
                                    
                                  
                                
                              ) : isConfirmed ? (
                                
                                  
                                    ✓ Confirmed
                                  
                                  
                                    
                                      
                                    
                                    
                                      ETA: {new Date(myQuote?.eta || '').toLocaleString()}
                                    
                                  
                                
                              ) : isSelected ? (
                                
                                  ✓ Customer selected you
                                
                              ) : (
                                
                                  ⏳ Pending
                                
                              )}
                            
                          

                          {/* Vehicle Details */}
                          
                            
                              {/* Year, Make, Model Row */}
                              
                                {appointment.vehicles?.year && (
                                  
                                    {safeText(appointment.vehicles.year)}\
                                  
                                )}
                                {appointment.vehicles?.make && (
                                  
                                    {safeText(appointment.vehicles.make)}\
                                  
                                )}
                                {appointment.vehicles?.model && (
                                  
                                    {safeText(appointment.vehicles.model)}\
                                  
                                )}
                              
                              {/* VIN and Mileage Row */}
                              
                                {appointment.vehicles?.vin && (
                                  \
                                    VIN: {safeText(appointment.vehicles.vin)}
                                  
                                )}
                                {appointment.vehicles?.mileage && (
                                  \
                                    {appointment.vehicles.mileage.toLocaleString()} miles
                                  
                                )}
                              
                            
                          

                          {/* Location and Date */}
                          
                            
                              
                                
                                  
                                
                              
                            
                            
                              
                                
                              
                              
                                {formatDate(appointment.appointment_date)}
                              
                            
                          

                          {/* Issue Description */}
                          
                            
                              Issue Description
                            
                            
                              {safeText(appointment.issue_description || "No description provided")}
                            
                          

                          {/* Selected Services - UPCOMING APPOINTMENTS (around line 2257) */}
                          
                            
                              Selected Services
                            
                            
                              {(appointment.selected_services && appointment.selected_services.length > 0) ? (
                                appointment.selected_services.map((service: string, index: number) => (
                                  
                                    {safeText(service)}\
                                  
                                ))
                              ) : (\
                                
                                  None Selected
                                
                              )}
                            
                          

                          {/* Car Issues */}
                          {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 ? (
                            
                              
                                Car Issues\
                              
                              
                                {appointment.selected_car_issues.map((issue: string, index: number) => (
                                  
                                    {formatCarIssue(issue)}
                                  
                                ))}
                              
                            
                          ) : (
                            
                              
                                Car Issues
                              
                              
                                No car issues selected
                              
                            
                          )}

                          {/* Car Status */}
                          {appointment.car_runs !== null && (
                            
                              
                                Car Status
                              
                              
                                
                                  
                                
                                
                                  {appointment.car_runs ? "Car is running" : "Car is not running"}
                                
                              
                            
                          )}

                          {/* Action buttons */}
                          
                            {appointment.status === 'cancelled' ? (
                              
                                Appointment Cancelled
                              
                            ) : isConfirmed ? (
                              <>
                                {isFromSchedule ? (
                                  <>
                                    {isWithinTwoDays(appointment) ? (
                                      <>
                                        
                                          Edit
                                        
                                        
                                          Cancel
                                        
                                      </>
                                    ) : (
                                      
                                        View-only (past 2-day limit)
                                      
                                    )}
                                  </>
                                ) : (
                                  <>
                                    
                                      Start
                                    
                                    
                                      Cancel
                                    
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {isEditing ? (
                                  <>
                                    
                                      Update Quote
                                    
                                    
                                      Cancel
                                    
                                  </>
                                ) : (
                                  
                                    
                                      Edit
                                    
                                    {appointment.payment_status !== 'paid' && (
                                      
                                        Cancel
                                      
                                    )}
                                  
                                )}
                              </>
                            )}
                          
                        
                      );
                    })()}
                  
                )}

                {/* Pagination Dots */}
                {filteredUpcomingAppointments.length > 1 && (
                  
                    
                      {filteredUpcomingAppointments.map((_, index) => (
                        
                      ))}
                    
                  
                )}
              
            
          

          {/* Column 2: Schedule */}
          

          {/* Column 3: Available Appointments */}
          
            
              
                Available Appointments
              
              
                New appointments to quote
              
            
            {(() => {
              console.log('🎯 AVAILABLE APPOINTMENTS RENDER DEBUG:', {
                isAppointmentsLoading,
                availableAppointmentsLength: availableAppointments.length,
                filteredAvailableLength: filteredAvailableAppointments.length,
                searchQuery,
                willShowCards: !isAppointmentsLoading && filteredAvailableAppointments.length > 0
              });
              return null;
            })()}
            {isAppointmentsLoading ? (
              
                
                  
                
              
            ) : filteredAvailableAppointments.length === 0 ? (
              
                
                  
                
                
                  {searchQuery ? 'No Appointments Found' : 'No Available Appointments'}
                
                
                  {searchQuery 
                    ? `No appointments match "${safeText(searchQuery)}". Try a different search term.`
                    : 'There are no pending appointments at this time. Check back later for new requests.'
                  }
                
                {!searchQuery && (
                  
                    Refresh
                  
                )}
              
            ) : (
              
                {(() => {
                  console.log('🎯 RENDERING AVAILABLE APPOINTMENT CARDS:', availableAppointments.length);
                  return null;
                })()}
                {/* Navigation buttons for multiple appointments */}
                {filteredAvailableAppointments.length > 1 && (
                  <>
                    
                      
                        
                          
                        
                      
                    
                    
                      
                        
                          
                        
                      
                    
                  </>
                )}

                {/* Current appointment details */}
                {filteredAvailableAppointments[currentAvailableIndex] && (
                  
                    {/* Editing Protection Warning */}
                    {filteredAvailableAppointments[currentAvailableIndex].is_being_edited && (
                      
                        
                          
                            ⚠️
                          
                          
                            Customer is currently editing this appointment
                          
                        
                      
                    )}

                    {/* Edited After Quotes Warning */}
                    {filteredAvailableAppointments[currentAvailableIndex].edited_after_quotes && (
                      
                        
                          
                            🔄
                          
                          
                            
                              Appointment Updated
                            
                            
                              Customer modified details. Previous quotes removed.
                            
                          
                        
                      
                    )}

                    {/* Recently Updated Badge */}
                    {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && 
                     new Date().getTime() - new Date(filteredAvailableAppointments[currentAvailableIndex].last_edited_at).getTime() < 3600000 && (
                      
                        Recently Updated
                      
                    )}

                    {/* Location and Date */}
                    
                      
                        
                          
                            
                          
                        
                      
                      
                        
                          
                        
                        
                          {formatDate(filteredAvailableAppointments[currentAvailableIndex].appointment_date)}
                        
                      
                    

                    {/* Vehicle Information */}
                    
                      
                        {/* Year, Make, Model Row */}
                        
                          {(() => {
                            const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                            console.log('🎯 Rendering vehicle info for appointment:', {
                              appointmentId: filteredAvailableAppointments[currentAvailableIndex]?.id,
                              hasVehicle: !!vehicle,
                              vehicleData: vehicle
                            });
                            
                            if (!vehicle) {
                              return 
                                Vehicle information not available
                              ;
                            }
                            
                            const hasBasicInfo = vehicle.year || vehicle.make || vehicle.model;
                            if (!hasBasicInfo) {
                              return 
                                No vehicle details available
                              ;
                            }
                            
                            return (
                              <>
                                {vehicle.year && 
                                  {safeText(vehicle.year)}
                                }
                                {vehicle.make && 
                                  {safeText(vehicle.make)}
                                }
                                {vehicle.model && 
                                  {safeText(vehicle.model)}
                                }
                              </>
                            );
                          })()}
                    
                        {/* VIN and Mileage Row */}
                        
                          {(() => {
                            const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                            if (!vehicle) return null;
                            
                            const hasDetails = vehicle.vin || vehicle.mileage;
                            if (!hasDetails) return null;
                            
                            return (
                              <>
                                {vehicle.vin && 
                                  VIN: {safeText(vehicle.vin)}
                                }
                                {vehicle.mileage && (
                                  
                                    {vehicle.mileage.toLocaleString()} miles
                                  
                                )}
                              </>
                            );
                          })()}
                        
                      
                    

                    {/* Selected Services - AVAILABLE APPOINTMENTS (around line 2626) */}
                    
                      {/* Selected Services */}
                      {filteredAvailableAppointments[currentAvailableIndex].selected_services && (
                        
                          
                            Selected Services
                          
                          
                            {(filteredAvailableAppointments[currentAvailableIndex].selected_services && 
                              filteredAvailableAppointments[currentAvailableIndex].selected_services.length > 0) ? (
                              filteredAvailableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                                
                                  {safeText(service)}
                                
                              ))
                            ) : (
                              
                                None Selected
                              
                            )}
                          
                        
                      )}

                      {/* Car Status */}
                      {filteredAvailableAppointments[currentAvailableIndex].car_runs !== null && (
                        
                          
                            Car Status
                          
                          
                            
                              
                                
                              
                              
                                {filteredAvailableAppointments[currentAvailableIndex].car_runs
                                  ? "Car is running"
                                  : "Car is not running"}
                                
                              
                            
                          
                        
                      )}
                    

                    {/* Car Issues Section */}
                    {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues && filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.length > 0 ? (
                      
                        
                          Car Issues
                        
                        
                          {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.map((issue: string, index: number) => (
                            
                              {formatCarIssue(issue)}
                            
                          ))}
                        
                      
                    ) : (
                      
                        
                          Car Issues
                        
                        
                          No car issues selected
                        
                      
                    )}

                    {/* Issue Description */}
                    
                      
                        Issue Description
                      
                      
                        {safeText(availableAppointments[currentAvailableIndex].issue_description || "No description provided")}
                      
                    

                    {/* Edit Timestamp */}
                    {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && (
                      
                        
                          Edited {formatRelativeTime(filteredAvailableAppointments[currentAvailableIndex].last_edited_at)}
                        
                      
                    )}

                    {/* Quote Input */}
                    
                      
                        Your Quote (USD)
                      
                      
                        
                          $
                          
                            
                          
                        
                      
                    

                    {/* ETA Selection */}
                    
                      
                        When can you show up? 
                      
                      
                        {/* Date Selection */}
                        
                          
                            Select Date
                          
                          
                            
                              Choose a date
                            
                            {getAvailableDates().map((date) => (
                              
                                {date.label}
                              
                            ))}
                          
                        

                        {/* Time Selection */}
                        
                          
                            Select Time
                          
                          
                            
                              Choose a time
                            
                            {getTimeSlots(selectedDate).map((slot) => (
                              
                                {slot.label}
                              
                            ))}
                          
                        
                      
                      
                        {showETAError && (!selectedDate || !selectedTime) && (
                          
                            Please select both date and time
                          
                        )}
                      
                    


                    {/* Action Buttons */}
                    
                      {/* Check if customer has completed booking (has phone number) */}
                      {(() => {
                        const currentAppointment = availableAppointments[currentAvailableIndex];
                        const hasCompletedBooking = currentAppointment?.phone_number && 
                          (currentAppointment?.issue_description || 
                           (currentAppointment?.selected_services && currentAppointment.selected_services.length > 0));
                        
                        // Check if appointment is being edited
                        const isBeingEdited = currentAppointment?.is_being_edited;
                        const isQuotable = !isBeingEdited;
                        
                        if (!hasCompletedBooking) {
                          return (
                            
                              
                                ⏳
                                Cannot Quote Yet
                              
                            
                          );
                        }
                        
                        if (!isQuotable) {
                          return (
                            
                              
                                ⚠️
                                Appointment Being Edited
                              
                            
                          );
                        }
                        
                        return (
                          
                            {isProcessing ? (
                              
                                
                                  
                                
                                Processing...
                              
                            ) : (
                              "Send"
                            )}
                          
                        );
                      })()}
                      
                        Skip
                      
                    
                  

                    {/* Pagination Dots */}
                    {availableAppointments.length > 1 && (
                      
                        {availableAppointments.map((_, index: number) => (
                          
                        ))}
                      
                    )}
                  
                )}
              
            
          
        

        {/* Empty State for No Appointments */}
        {!isAppointmentsLoading && 
         availableAppointments.length === 0 && 
         upcomingAppointments.length === 0 && 
         skippedAppointments.length === 0 && (
          
            
              
                
              
              
                Welcome to Your Dashboard
              
              
                You don't have any appointments yet. When customers request service in your area, 
                you'll see them appear here.
              
              
                
                  Refresh
                
                
                  Update Profile
                
              
            
          
        )}
                    
      

      {/* ETA Modal */}
      {startingAppointment && (
        
          
            
              Start Appointment
            
            
              
                Estimated arrival time to customer location:
              
              
                
                
                  minutes
                
              
              
                Customer will be notified of your ETA
              
            

            
              
                {isStarting ? 'Starting...' : 'Start Job'}
              
              
                Go Back
              
            
          
        
      )}

      {/* Edit Modal */}
      {showEditModal && editAppointment && (
        
          
            
              Edit Quote
            
            
              
                {/* Price Input */}
                
                  
                    Price (USD)
                  
                  
                    $
                    
                  
                
              

              {/* ETA Selection */}
              
                
                  When can you show up?
                
                
                  {/* Date Selection */}
                  
                    
                      Select Date
                    
                    
                      
                        Choose a date
                      
                      {getAvailableDates().map((date) => (
                        
                          {date.label}
                        
                      ))}
                    
                  

                  {/* Time Selection */}
                  
                    
                      Select Time
                    
                    
                      
                        Choose a time
                      
                      {getTimeSlots(editDate).map((slot) => (
                        
                          {slot.label}
                        
                      ))}
                    
                  
                
              
            

            {/* Action Buttons */}
            
              
                {isProcessing ? 'Updating...' : 'Update Quote'}
              
              
                Cancel
              
            
          
        
      )}

      {/* Schedule Cancel Modal */}
      {showScheduleCancelModal && (
        

          
            
              Who initiated the cancellation?
            
            
              
                
                  Cancellation Type
                
                
                  
                    
                      Customer Reasons
                    
                  
                  
                    
                      Mechanic Reasons
                    
                  
                
              
            

            
              
                Reason
              
              
                
                  Select a reason
                  {cancellationType === 'customer' ? (
                    <>
                      
                        Customer cancelled
                      
                      
                        Customer did not answer
                      
                    </>
                  ) : (
                    <>
                      
                        I did not show up
                      
                      
                        I did not complete the work
                      
                      
                        I decided to cancel
                      
                    </>
                  )}
                
              
            

            
              
                {cancellationType === 'customer' 
                  ? "Customer will receive a full refund. A cancellation fee will be charged to the customer."
                  : "Customer will receive a full refund. You will be charged a cancellation fee."
                }
              
            
          

          
            
              Confirm Cancellation
            
            
              Cancel
            
          
        
      )}
    

      
    
  )
}
