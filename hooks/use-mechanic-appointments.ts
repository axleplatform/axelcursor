"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export type AppointmentStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "pending_payment"

export interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  vin: string | null
  mileage: string | null
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
  // We'll make this flexible to handle different column names
  mechanic_id?: string | null
  provider_id?: string | null
  technician_id?: string | null
  assigned_to?: string | null
  created_at: string
  vehicles: Vehicle | null
}

// This function helps us determine which column is used for mechanic assignment
function getMechanicColumn(appointment: any): string | null {
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
  const [error, setError] = useState<string | null>(null)
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
          setError("The mechanic quotes system is not set up. Please contact support.")
          toast({
            title: "System Error",
            description: "The mechanic quotes system is not properly configured. Please contact support.",
            variant: "destructive",
          })
          throw quotesError
        }

        // Get IDs of appointments this mechanic has already quoted
        const quotedAppointmentIds = existingQuotes?.map((q) => q.appointment_id) || []

        // Fetch upcoming appointments (accepted by this mechanic)
        const { data: upcomingData, error: upcomingError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .in("status", ["accepted", "in_progress", "pending_payment"])
          .eq(mechanicColumn, mechanicId)
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
        setError("Failed to load appointments")
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

    return () => {
      supabase.removeChannel(appointmentsSubscription)
      supabase.removeChannel(quotesSubscription)
    }
  }, [mechanicId, toast, mechanicColumn])

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
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
      setUpcomingAppointments((prev) =>
        prev.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status } : appointment)),
      )

      return true
    } catch (err) {
      console.error(`Error updating appointment status to ${status}:`, err)
      return false
    }
  }

  // Accept an available appointment by creating a quote
  const acceptAppointment = async (appointmentId: string, price: number) => {
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
      })

      if (quoteError) {
        // If it's a unique constraint violation, the mechanic already quoted this appointment
        if (quoteError.code === "23505") {
          // Update the existing quote instead
          const { error: updateError } = await supabase
            .from("mechanic_quotes")
            .update({ price, updated_at: new Date().toISOString() })
            .eq("appointment_id", appointmentId)
            .eq("mechanic_id", mechanicId)

          if (updateError) throw updateError
        } else {
          throw quoteError
        }
      }

      // Remove from available appointments
      setAvailableAppointments((prev) => prev.filter((a) => a.id !== appointmentId))

      return true
    } catch (err) {
      console.error("Error accepting appointment:", err)
      return false
    }
  }

  // Update price for an appointment
  const updateAppointmentPrice = async (appointmentId: string, price: number) => {
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
        setUpcomingAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, price } : a)))
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
  const denyAppointment = async (appointmentId: string) => {
    try {
      // For denying, we just remove it from the available list for this mechanic
      // We don't update the backend status since other mechanics might want to accept it
      setAvailableAppointments((prev) => prev.filter((a) => a.id !== appointmentId))
      return true
    } catch (err) {
      console.error("Error denying appointment:", err)
      return false
    }
  }

  // Start an appointment
  const startAppointment = async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, "in_progress")
  }

  // Cancel an appointment
  const cancelAppointment = async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, "cancelled")
  }

  return {
    upcomingAppointments,
    availableAppointments,
    isLoading,
    error,
    mechanicColumn,
    startAppointment,
    cancelAppointment,
    acceptAppointment,
    denyAppointment,
    updateAppointmentPrice,
  }
}
