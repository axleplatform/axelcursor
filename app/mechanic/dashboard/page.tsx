"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { AppointmentCard } from "@/components/appointment-card"
import { useToast } from "@/components/ui/use-toast"

export default function MechanicDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [availableAppointments, setAvailableAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [price, setPrice] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Create Supabase client
  const supabase = createClient()

  useEffect(() => {
    const fetchMechanicId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: mechanicProfile } = await supabase
        .from("mechanic_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (mechanicProfile) {
        setMechanicId(mechanicProfile.id)
      }
    }

    fetchMechanicId()
  }, [router])

  useEffect(() => {
    if (!mechanicId) return

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)

        // Fetch available appointments (not quoted or skipped)
        const { data: available, error: availableError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*),
            mechanic_quotes(*)
          `)
          .not("id", "in", (
            await supabase
              .from("mechanic_quotes")
              .select("appointment_id")
              .eq("mechanic_id", mechanicId)
          ).data?.map(q => q.appointment_id) || [])
          .not("id", "in", (
            await supabase
              .from("mechanic_skipped_appointments")
              .select("appointment_id")
              .eq("mechanic_id", mechanicId)
          ).data?.map(s => s.appointment_id) || [])
          .eq("status", "pending")

        if (availableError) throw availableError

        // Fetch upcoming appointments (quoted)
        const { data: upcoming, error: upcomingError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*),
            mechanic_quotes(*)
          `)
          .in("id", (
            await supabase
              .from("mechanic_quotes")
              .select("appointment_id")
              .eq("mechanic_id", mechanicId)
          ).data?.map(q => q.appointment_id) || [])
          .in("status", ["pending", "confirmed"])

        if (upcomingError) throw upcomingError

        setAvailableAppointments(available || [])
        setUpcomingAppointments(upcoming || [])
      } catch (error) {
        console.error("Error fetching appointments:", error)
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

    // Subscribe to changes
    const subscription = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          fetchAppointments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [mechanicId, toast])

  const handleSubmitQuote = async (appointmentId: string) => {
    try {
      if (!price || !selectedDate || !selectedTime) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      const eta = new Date(`${selectedDate}T${selectedTime}`)

      const { error } = await supabase.from("mechanic_quotes").insert({
        mechanic_id: mechanicId,
        appointment_id: appointmentId,
        price: parseFloat(price),
        eta: eta.toISOString(),
        notes,
        status: "pending",
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Quote submitted successfully.",
      })

      // Reset form
      setPrice("")
      setSelectedDate("")
      setSelectedTime("")
      setNotes("")
    } catch (error) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateQuote = async (appointmentId: string) => {
    try {
      if (!price || !selectedDate || !selectedTime) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      const eta = new Date(`${selectedDate}T${selectedTime}`)

      const { error } = await supabase
        .from("mechanic_quotes")
        .update({
          price: parseFloat(price),
          eta: eta.toISOString(),
          notes,
        })
        .eq("appointment_id", appointmentId)
        .eq("mechanic_id", mechanicId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Quote updated successfully.",
      })

      // Reset form
      setSelectedAppointment(null)
      setPrice("")
      setSelectedDate("")
      setSelectedTime("")
      setNotes("")
    } catch (error) {
      console.error("Error updating quote:", error)
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSkipAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("mechanic_skipped_appointments").insert({
        mechanic_id: mechanicId,
        appointment_id: appointmentId,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Appointment skipped successfully.",
      })
    } catch (error) {
      console.error("Error skipping appointment:", error)
      toast({
        title: "Error",
        description: "Failed to skip appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Mechanic Dashboard</h1>
              <p className="text-lg text-gray-600 mt-1">Manage your appointments</p>
            </div>

            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow bg-[#f5f5f5]">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#294a46]">Mechanic Dashboard</h1>
            <p className="text-lg text-gray-600 mt-1">Manage your appointments</p>
          </div>

          <div className="space-y-12">
            {/* Available Appointments */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#294a46]">Available Appointments</h2>
                <p className="text-sm text-gray-500 mt-1">New appointments to quote</p>
              </div>

              <div className="grid gap-4">
                {availableAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isUpcoming={false}
                    mechanicId={mechanicId || undefined}
                    selectedAppointment={selectedAppointment}
                    onEdit={setSelectedAppointment}
                    onUpdate={handleUpdateQuote}
                    onCancel={() => setSelectedAppointment(null)}
                    onSkip={handleSkipAppointment}
                    onSubmit={handleSubmitQuote}
                    price={price}
                    setPrice={setPrice}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedTime={selectedTime}
                    setSelectedTime={setSelectedTime}
                    notes={notes}
                    setNotes={setNotes}
                  />
                ))}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#294a46]">Upcoming Appointments</h2>
                <p className="text-sm text-gray-500 mt-1">Your quoted & confirmed jobs</p>
              </div>

              <div className="grid gap-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isUpcoming={true}
                    mechanicId={mechanicId || undefined}
                    selectedAppointment={selectedAppointment}
                    onEdit={setSelectedAppointment}
                    onUpdate={handleUpdateQuote}
                    onCancel={() => setSelectedAppointment(null)}
                    price={price}
                    setPrice={setPrice}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedTime={selectedTime}
                    setSelectedTime={setSelectedTime}
                    notes={notes}
                    setNotes={setNotes}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
