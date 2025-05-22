"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

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

export function useMechanicAppointments(mechanicId: string) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [availableAppointments, setAvailableAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [mechanicColumn, setMechanicColumn] = useState<string | null>(null)
  const { toast } = useToast()

  // First, determine which column is used for mechanic assignment
  useEffect(() => {
    if (!mechanicId) return

    const detectMechanicColumn = async () => {
      try {
        // Get a sample appointment to check its structure
        const { data, error: sampleError } = await supabase.from("appointments").select("*").limit(1)

        if (sampleError) {
          throw sampleError
        }

        if (data && data.length > 0) {
          const column = getMechanicColumn(data[0])
          console.log("Detected mechanic column:", column)
          setMechanicColumn(column)
        } else {
          console.log("No appointments found to detect schema")
          // Default to mechanic_id if we can't detect
          setMechanicColumn("mechanic_id")
        }
      } catch (err) {
        console.error("Error detecting mechanic column:", err)
        // Default to mechanic_id if we can't detect
        setMechanicColumn("mechanic_id")
      }
    }

    detectMechanicColumn()
  }, [mechanicId])

  // Fetch appointments once we know the mechanic column
  useEffect(() => {
    if (!mechanicColumn || !mechanicId) return

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log(`Using ${mechanicColumn} to filter appointments for mechanic ${mechanicId}`)

        // First, get all quotes this mechanic has already submitted
        const { data: existingQuotes, error: quotesError } = await supabase
          .from("mechanic_quotes")
          .select("appointment_id")
          .eq("mechanic_id", mechanicId)

        if (quotesError && quotesError.code === "PGRST116") {
          // Table doesn't exist
          setError(new Error("The mechanic quotes system is not set up. Please contact support."))
          toast({
            title: "System Error",
            description: "The mechanic quotes system is not properly configured. Please contact support.",
            variant: "destructive",
          })
          throw quotesError
        }

        // Get IDs of appointments this mechanic has already quoted
        const quotedAppointmentIds = existingQuotes?.map((q: { appointment_id: string }) => q.appointment_id) || []

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
        () => {
          // Refresh appointments when changes occur
          fetchAppointments()
        },
      )
      .subscribe()

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
        () => {
          // Refresh appointments when quotes change
          fetchAppointments()
        },
      )
      .subscribe()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("mechanic-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Real-time update received:", payload)
          if (payload.eventType === "INSERT") {
            const newAppointment = payload.new as Appointment
            if (newAppointment.status === "pending") {
              setAvailableAppointments((prev) => [...prev, newAppointment])
            } else if (
              newAppointment.mechanic_id === mechanicId &&
              (newAppointment.status === "confirmed" || newAppointment.status === "in_progress")
            ) {
              setUpcomingAppointments((prev) => [...prev, newAppointment])
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedAppointment = payload.new as Appointment
            const oldAppointment = payload.old as Appointment

            // Handle status changes
            if (updatedAppointment.status === "pending") {
              setAvailableAppointments((prev) =>
                prev.map((appointment) =>
                  appointment.id === updatedAppointment.id ? updatedAppointment : appointment,
                ),
              )
            } else if (
              updatedAppointment.mechanic_id === mechanicId &&
              (updatedAppointment.status === "confirmed" || updatedAppointment.status === "in_progress")
            ) {
              setUpcomingAppointments((prev) =>
                prev.map((appointment) =>
                  appointment.id === updatedAppointment.id ? updatedAppointment : appointment,
                ),
              )
            }

            // Remove from available if no longer pending
            if (oldAppointment.status === "pending" && updatedAppointment.status !== "pending") {
              setAvailableAppointments((prev) =>
                prev.filter((appointment) => appointment.id !== updatedAppointment.id),
              )
            }

            // Remove from upcoming if no longer confirmed/in_progress
            if (
              oldAppointment.mechanic_id === mechanicId &&
              (oldAppointment.status === "confirmed" || oldAppointment.status === "in_progress") &&
              updatedAppointment.status !== "confirmed" &&
              updatedAppointment.status !== "in_progress"
            ) {
              setUpcomingAppointments((prev) =>
                prev.filter((appointment) => appointment.id !== updatedAppointment.id),
              )
            }
          } else if (payload.eventType === "DELETE") {
            const deletedAppointment = payload.old as Appointment
            setAvailableAppointments((prev) =>
              prev.filter((appointment) => appointment.id !== deletedAppointment.id),
            )
            setUpcomingAppointments((prev) =>
              prev.filter((appointment) => appointment.id !== deletedAppointment.id),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsSubscription)
      supabase.removeChannel(quotesSubscription)
      subscription.unsubscribe()
    }
  }, [mechanicId, toast, mechanicColumn])

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus): Promise<boolean> => {
    if (!mechanicColumn || !mechanicId) {
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
      // Create a quote for this appointment
      const { error: quoteError } = await supabase.from("mechanic_quotes").insert({
        appointment_id: appointmentId,
        mechanic_id: mechanicId,
        price,
        eta: "1-2 hours", // Default ETA
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (quoteError) {
        // If it's a unique constraint violation, the mechanic already quoted this appointment
        if (quoteError.code === "23505") {
          // Update the existing quote instead
          const { error: updateError } = await supabase
            .from("mechanic_quotes")
            .update({
              price,
              updated_at: new Date().toISOString(),
            })
            .eq("appointment_id", appointmentId)
            .eq("mechanic_id", mechanicId)

          if (updateError) throw updateError
        } else {
          throw quoteError
        }
      }

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
          .eq(mechanicColumn!, mechanicId)

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
    mechanicColumn,
    startAppointment,
    completeAppointment,
    cancelAppointment,
    acceptAppointment,
    denyAppointment,
    updateAppointmentPrice,
  }
}
