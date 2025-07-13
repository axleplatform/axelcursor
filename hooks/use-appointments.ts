"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export type AppointmentStatus = "pending" | "quoted" | "confirmed" | "in_progress" | "completed" | "cancelled"

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

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles!fk_appointment_id(*)
          `)
          .order("appointment_date", { ascending: true })

        if (error) throw error

        setAppointments(data || [])
      } catch (err) {
        console.error("Error fetching appointments:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch appointments"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log("Real-time update received:", payload)
          if (payload.eventType === "INSERT") {
            setAppointments((prev: Appointment[]) => [...prev, payload.new as Appointment])
          } else if (payload.eventType === "UPDATE") {
            setAppointments((prev: Appointment[]) =>
              prev.map((appointment: Appointment) =>
                appointment.id === payload.new.id ? (payload.new as Appointment) : appointment,
              ),
            )
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev: Appointment[]) => prev.filter((appointment: Appointment) => appointment.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setAppointments((prev: Appointment[]) =>
        prev.map((appointment: Appointment) =>
          appointment.id === appointmentId ? { ...appointment, status } : appointment,
        ),
      )

      return true
    } catch (err) {
      console.error(`Error updating appointment status to ${status}:`, err)
      return false
    }
  }

  // Update appointment price (now handled through mechanic_quotes table)
  const updateAppointmentPrice = async (appointmentId: string, price: number) => {
    try {
      // Price is now stored in mechanic_quotes table, not appointments table
      // This function is kept for compatibility but should be updated to work with quotes
      console.warn('updateAppointmentPrice: Price updates should be handled through mechanic_quotes table')
      return false
    } catch (err) {
      console.error(`Error updating appointment price:`, err)
      return false
    }
  }

  // Start an appointment
  const startAppointment = async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, "in_progress")
  }

  // Complete an appointment
  const completeAppointment = async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, "completed")
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
    completeAppointment,
    cancelAppointment,
    updateAppointmentPrice,
  }
}
