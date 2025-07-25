"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createOrUpdateQuote } from "@/lib/mechanic-quotes"

export type AppointmentStatus = "draft" | "pending" | "quoted" | "confirmed" | "in_progress" | "completed" | "cancelled"

export interface Vehicle {
  id: string
  appointment_id: string
  vin: string | null
  year: number
  make: string
  model: string
  mileage: number | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  location: string
  latitude?: number
  longitude?: number
  appointment_date: string
  status: AppointmentStatus
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
  vehicles: Vehicle | null
}

// This function helps us determine which column is used for mechanic assignment
function getMechanicColumn(appointment: Record<string, unknown>): string | null {
  // Check for common column names
  const possibleColumns = ["mechanic_id", "provider_id", "technician_id", "assigned_to"]

  for (const column of possibleColumns) {
    if (column in appointment) {
      return column
    }
  }

  return null
}

type SubscriptionStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'

export function useMechanicAppointments(mechanicId: string) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [availableAppointments, setAvailableAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!mechanicId) return

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        console.log("🚀 OPTIMIZED: Fetching appointments for mechanic:", mechanicId)

        // PERFORMANCE FIX 1: Get skipped appointment IDs first for exclusion
        const { data: skippedData, error: skippedError } = await supabase
          .from("mechanic_skipped_appointments")
          .select("appointment_id")
          .eq("mechanic_id", mechanicId)

        if (skippedError) throw skippedError

        const skippedAppointmentIds = skippedData?.map((skip: any) => skip.appointment_id) || []
        console.log("🚀 OPTIMIZED: Found skipped appointments:", skippedAppointmentIds.length)

        // PERFORMANCE FIX 2: Get quoted appointment IDs for exclusion
        const { data: quotedData, error: quotedError } = await supabase
          .from("mechanic_quotes")
          .select("appointment_id")
          .eq("mechanic_id", mechanicId)

        if (quotedError) throw quotedError

        const quotedAppointmentIds = quotedData?.map((quote: any) => quote.appointment_id) || []
        console.log("🚀 OPTIMIZED: Found quoted appointments:", quotedAppointmentIds.length)

        // PERFORMANCE FIX 3: Fetch upcoming appointments - both assigned and unassigned
        let upcomingQuery = supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*),
            mechanic_quotes!appointment_id(*)
          `)
          .or(`mechanic_id.eq.${mechanicId},mechanic_id.is.null`)
          .in("status", ["confirmed", "in_progress", "pending"])
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days for upcoming
          .order("appointment_date", { ascending: true })
          .limit(20)

        const { data: upcomingData, error: upcomingError } = await upcomingQuery

        if (upcomingError) throw upcomingError

        // PERFORMANCE FIX 4: Fetch ONLY available appointments with aggressive database filtering
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        
        let availableQuery = supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*),
            mechanic_quotes!appointment_id(*)
          `)
          .in("status", ["pending", "quoted"]) // Only pending or quoted status
          .gte("created_at", sevenDaysAgo) // Only last 7 days
          .order("created_at", { ascending: false }) // Newest first
          .limit(20) // Maximum 20 results

        // Exclude skipped appointments at database level
        if (skippedAppointmentIds.length > 0) {
          availableQuery = availableQuery.not("id", "in", `(${skippedAppointmentIds.join(",")})`)
        }

        // Exclude already quoted appointments at database level  
        if (quotedAppointmentIds.length > 0) {
          availableQuery = availableQuery.not("id", "in", `(${quotedAppointmentIds.join(",")})`)
        }

        const { data: availableData, error: availableError } = await availableQuery

        if (availableError) throw availableError

        console.log("🚀 OPTIMIZED: Database query results:", {
          upcoming: upcomingData?.length || 0,
          available: availableData?.length || 0,
          totalFetched: (upcomingData?.length || 0) + (availableData?.length || 0),
          skippedCount: skippedAppointmentIds.length,
          quotedCount: quotedAppointmentIds.length
        })

        // Filter available appointments to only show those without quotes from this mechanic
        // FIXED: Include edited appointments that have been cleared of quotes
        const filteredAvailable = availableData?.filter((appointment: any) => {
          const hasMyQuote = appointment.mechanic_quotes?.some((quote: any) => quote.mechanic_id === mechanicId)
          const isEdited = appointment.edited_after_quotes
          
          console.log("🔍 Hook filtering appointment:", {
            appointmentId: appointment.id,
            hasMyQuote,
            isEdited,
            shouldInclude: !hasMyQuote
          })
          
          // Include if no current quotes from this mechanic
          // This ensures edited appointments (which have no quotes) are included
          return !hasMyQuote
        }) || []

        // For upcoming, include appointments where this mechanic has quotes
        const filteredUpcoming = upcomingData?.filter((appointment: any) => {
          const hasMyQuote = appointment.mechanic_quotes?.some((quote: any) => quote.mechanic_id === mechanicId)
          return hasMyQuote || appointment.mechanic_id === mechanicId
        }) || []

        setUpcomingAppointments(filteredUpcoming as Appointment[])
        setAvailableAppointments(filteredAvailable as Appointment[])
        
        console.log("🚀 OPTIMIZED: Final filtered results:", {
          upcomingFinal: filteredUpcoming.length,
          availableFinal: filteredAvailable.length
        })

      } catch (err) {
        console.error("❌ Error fetching appointments:", err)
        setError(err instanceof Error ? err : new Error("Failed to load appointments"))
        toast({
          title: "Error",
          description: "Failed to load appointments. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()

    // REAL-TIME FIX: Enhanced subscription with proper state updates
    const appointmentsSubscription = (supabase as any)
      .channel("appointments-changes-optimized")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `status=in.(pending,quoted,confirmed,in_progress)` // Only relevant statuses
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log("🔔 REAL-TIME: Appointment change detected:", payload.eventType)
          // Refresh appointments when changes occur
          fetchAppointments()
        },
      )
      .subscribe((status: SubscriptionStatus) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ REAL-TIME: Successfully subscribed to appointments changes')
        } else if (status === 'CLOSED') {
          console.log('🔄 REAL-TIME: Subscription closed, attempting to reconnect...')
          setTimeout(() => {
            appointmentsSubscription.subscribe()
          }, 1000)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ REAL-TIME: Subscription error, attempting to reconnect...')
          setTimeout(() => {
            appointmentsSubscription.subscribe()
          }, 1000)
        }
      })

    // Enhanced quotes subscription
    const quotesSubscription = (supabase as any)
      .channel("mechanic-quotes-changes-optimized")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanic_quotes",
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("🔔 REAL-TIME: Quote change detected:", payload.eventType)
          // Refresh appointments when quotes change
          fetchAppointments()
        },
      )
      .subscribe((status: SubscriptionStatus) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ REAL-TIME: Successfully subscribed to quotes changes')
        } else if (status === 'CLOSED') {
          console.log('🔄 REAL-TIME: Subscription closed, attempting to reconnect...')
          setTimeout(() => {
            quotesSubscription.subscribe()
          }, 1000)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ REAL-TIME: Subscription error, attempting to reconnect...')
          setTimeout(() => {
            quotesSubscription.subscribe()
          }, 1000)
        }
      })

    // Subscribe to mechanic skips for real-time skip updates
    const skipsSubscription = (supabase as any)
      .channel("mechanic-skips-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanic_skipped_appointments",
          filter: `mechanic_id=eq.${mechanicId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("🔔 REAL-TIME: Skip change detected:", payload.eventType)
          // Refresh appointments when skips change
          fetchAppointments()
        },
      )
      .subscribe()

    return () => {
      console.log("🧹 CLEANUP: Removing optimized subscriptions")
      ;(supabase as any).removeChannel(appointmentsSubscription)
      ;(supabase as any).removeChannel(quotesSubscription) 
      ;(supabase as any).removeChannel(skipsSubscription)
    }
  }, [mechanicId, toast])

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus): Promise<boolean> => {
    if (!mechanicId) {
      toast({
        title: "Error",
        description: "Could not determine how mechanics are assigned to appointments",
        variant: "destructive",
      })
      return false
    }

    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) => (appointment.id === appointmentId ? { ...appointment, status } : appointment)),
      )

      return true
    } catch (err) {
      console.error(`Error updating appointment status to ${status}:`, err)
      return false
    }
  }

  // Accept an available appointment by creating a quote
  const acceptAppointment = async (appointmentId: string, price: number): Promise<boolean> => {
    if (!mechanicId) {
      toast({
        title: "Error",
        description: "Mechanic ID is required",
        variant: "destructive",
      })
      return false
    }

    try {
      const { success, error } = await createOrUpdateQuote(
        mechanicId,
        appointmentId,
        price,
        "1-2 hours", // Default ETA
        "" // Default notes
      )

      if (error) throw error

      // Update appointment status to quoted
      const { error: updateAppointmentError } = await supabase
        .from("appointments")
        .update({
          status: "quoted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)

      if (updateAppointmentError) throw updateAppointmentError

      // Remove from available appointments
      setAvailableAppointments((prev: Appointment[]) => prev.filter((a: Appointment) => a.id !== appointmentId))

      return true
    } catch (err) {
      console.error("Error accepting appointment:", err)
      return false
    }
  }

  // Update price for an appointment (always updates the mechanic quote, not appointment directly)
  const updateAppointmentPrice = async (appointmentId: string, price: number): Promise<boolean> => {
    if (!mechanicId) return false

    try {
      // Price is always stored in mechanic_quotes table, not appointments table
      const { error } = await supabase
        .from("mechanic_quotes")
        .update({ price, updated_at: new Date().toISOString() })
        .eq("appointment_id", appointmentId)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state for upcoming appointments if this appointment exists there
      // Note: Price is now stored in mechanic_quotes table, not in appointment directly
      const appointment = upcomingAppointments.find((a: Appointment) => a.id === appointmentId)
      if (appointment) {
        // Refresh the appointment data to get updated quote information
        setUpcomingAppointments((prev: Appointment[]) => prev.map((a) => (a.id === appointmentId ? { ...a } : a)))
      }

      return true
    } catch (err) {
      console.error("Error updating price:", err)
      return false
    }
  }

  // Deny an available appointment
  const denyAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
      // For denying, we just remove it from the available list for this mechanic
      // We don't update the backend status since other mechanics might want to accept it
      setAvailableAppointments((prev: Appointment[]) => prev.filter((a: Appointment) => a.id !== appointmentId))
      return true
    } catch (err) {
      console.error("Error denying appointment:", err)
      return false
    }
  }

  // Start an appointment
  const startAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) =>
          appointment.id === appointmentId ? { ...appointment, status: "in_progress" } : appointment,
        ),
      )

      return true
    } catch (err) {
      console.error("Error starting appointment:", err)
      return false
    }
  }

  // Complete an appointment
  const completeAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) =>
          appointment.id === appointmentId ? { ...appointment, status: "completed" } : appointment,
        ),
      )

      return true
    } catch (err) {
      console.error("Error completing appointment:", err)
      return false
    }
  }

  // Cancel an appointment
  const cancelAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      // Update local state
      setUpcomingAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) =>
          appointment.id === appointmentId ? { ...appointment, status: "cancelled" } : appointment,
        ),
      )

      return true
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      return false
    }
  }

  return {
    upcomingAppointments,
    availableAppointments,
    isLoading,
    error,
    startAppointment,
    completeAppointment,
    cancelAppointment,
    acceptAppointment,
    denyAppointment,
    updateAppointmentPrice,
  }
}
