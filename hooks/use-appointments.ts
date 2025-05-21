"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type AppointmentStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled"

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
  user_id: string | null
  created_at: string
  vehicles: Vehicle | null
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all appointments with vehicle data
        const { data, error: fetchError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .order("appointment_date", { ascending: true })

        if (fetchError) throw fetchError

        setAppointments(data as Appointment[])
      } catch (err) {
        console.error("Error fetching appointments:", err)
        setError("Failed to load appointments")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()

    // Set up real-time subscription
    const appointmentsSubscription = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          // Refresh appointments when changes occur
          fetchAppointments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsSubscription)
    }
  }, [])

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status } : appointment)),
      )

      return true
    } catch (err) {
      console.error(`Error updating appointment status to ${status}:`, err)
      return false
    }
  }

  // Update appointment price
  const updateAppointmentPrice = async (appointmentId: string, price: number) => {
    try {
      const { error } = await supabase.from("appointments").update({ price }).eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === appointmentId ? { ...appointment, price } : appointment)),
      )

      return true
    } catch (err) {
      console.error(`Error updating appointment price:`, err)
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
    appointments,
    isLoading,
    error,
    startAppointment,
    cancelAppointment,
    updateAppointmentPrice,
  }
}
