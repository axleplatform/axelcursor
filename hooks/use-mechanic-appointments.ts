"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
  appointment_date: string
  status: AppointmentStatus
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

export function useMechanicAppointments() {
  const router = useRouter()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [availableAppointments, setAvailableAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!mechanicId) return

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        console.log("Fetching appointments for mechanic:", mechanicId)

        // Fetch upcoming appointments (confirmed or in progress)
        const { data: upcomingData, error: upcomingError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .eq("mechanic_id", mechanicId)
          .in("status", ["confirmed", "in_progress"])
          .order("appointment_date", { ascending: true })

        if (upcomingError) throw upcomingError

        // Get IDs of appointments already quoted by this mechanic
        const { data: quotedData, error: quotedError } = await supabase
          .from("mechanic_quotes")
          .select("appointment_id")
          .eq("mechanic_id", mechanicId)

        if (quotedError) throw quotedError

        const quotedAppointmentIds = quotedData?.map((quote) => quote.appointment_id) || []

        // Fetch available appointments (pending, not quoted by this mechanic yet)
        const { data: availableData, error: availableError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .eq("status", "pending")
          .not("id", "in", quotedAppointmentIds.length > 0 ? `(${quotedAppointmentIds.join(",")})` : "(0)")
          .order("appointment_date", { ascending: true })

        if (availableError) throw availableError

        setUpcomingAppointments(upcomingData as Appointment[])
        setAvailableAppointments(availableData as Appointment[])
        console.log("Fetched appointments:", {
          upcoming: upcomingData?.length,
          available: availableData?.length
        })
      } catch (err) {
        console.error("Error fetching appointments:", err)
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

    // Set up real-time subscription for appointments
    const appointmentsSubscription = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log("Appointment change detected:", payload)
          // Refresh appointments when changes occur
          fetchAppointments()
        },
      )
      .subscribe((status: SubscriptionStatus) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to appointments changes')
        } else if (status === 'CLOSED') {
          console.log('Subscription closed, attempting to reconnect...')
          // Attempt to reconnect after a delay
          setTimeout(() => {
            appointmentsSubscription.subscribe()
          }, 1000)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error, attempting to reconnect...')
          // Attempt to reconnect after a delay
          setTimeout(() => {
            appointmentsSubscription.subscribe()
          }, 1000)
        }
      })

    // Set up real-time subscription for mechanic quotes
    const quotesSubscription = supabase
      .channel("mechanic-quotes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanic_quotes",
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("Quote change detected:", payload)
          // Refresh appointments when quotes change
          fetchAppointments()
        },
      )
      .subscribe((status: SubscriptionStatus) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to quotes changes')
        } else if (status === 'CLOSED') {
          console.log('Subscription closed, attempting to reconnect...')
          // Attempt to reconnect after a delay
          setTimeout(() => {
            quotesSubscription.subscribe()
          }, 1000)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error, attempting to reconnect...')
          // Attempt to reconnect after a delay
          setTimeout(() => {
            quotesSubscription.subscribe()
          }, 1000)
        }
      })

    return () => {
      supabase.removeChannel(appointmentsSubscription)
      supabase.removeChannel(quotesSubscription)
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
        prev.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status } : appointment)),
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
      setAvailableAppointments((prev) => prev.filter((a) => a.id !== appointmentId))

      return true
    } catch (err) {
      console.error("Error accepting appointment:", err)
      return false
    }
  }

  // Update price for an appointment
  const updateAppointmentPrice = async (appointmentId: string, price: number): Promise<boolean> => {
    if (!mechanicId) return false

    try {
      // Check if this is a direct appointment update or a quote update
      const appointment = upcomingAppointments.find((a) => a.id === appointmentId)

      if (appointment) {
        // Direct appointment update
        const { error } = await supabase
          .from("appointments")
          .update({ price })
          .eq("id", appointmentId)
          .eq("mechanic_id", mechanicId)

        if (error) throw error

        // Update local state
        setUpcomingAppointments((prev: Appointment[]) => prev.map((a) => (a.id === appointmentId ? { ...a, price } : a)))
      } else {
        // Quote update
        const { error } = await supabase
          .from("mechanic_quotes")
          .update({ price, updated_at: new Date().toISOString() })
          .eq("appointment_id", appointmentId)
          .eq("mechanic_id", mechanicId)

        if (error) throw error
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
      setAvailableAppointments((prev: Appointment[]) => prev.filter((a) => a.id !== appointmentId))
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
      setUpcomingAppointments((prev) =>
        prev.map((appointment) =>
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
      setUpcomingAppointments((prev) =>
        prev.map((appointment) =>
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
      setUpcomingAppointments((prev) =>
        prev.map((appointment) =>
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
