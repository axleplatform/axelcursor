"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import AppointmentCard from "@/components/appointment-card"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function MechanicDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mechanicId, setMechanicId] = useState(null)
  const [availableAppointments, setAvailableAppointments] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [price, setPrice] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const fetchMechanicId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get mechanic profile
        const { data: mechanicProfile, error } = await supabase
          .from('mechanic_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setMechanicId(mechanicProfile.id)
      } catch (error) {
        console.error('Error fetching mechanic ID:', error)
        toast({
          title: "Error",
          description: "Failed to load mechanic profile. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchMechanicId()
  }, [router, toast])

  const fetchAppointments = async () => {
    if (!mechanicId) return

    try {
      // Get all appointments
      const { data: allAppointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicles(*),
          mechanic_quotes(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Categorize appointments
      const available = []
      const upcoming = []
      
      allAppointments?.forEach(appointment => {
        // Check if this mechanic has quoted
        const myQuote = appointment.mechanic_quotes?.find(
          q => q.mechanic_id === mechanicId
        )
        
        if (myQuote) {
          // Mechanic has quoted - goes to upcoming
          upcoming.push(appointment)
        } else {
          // No quote from this mechanic - available to quote
          available.push(appointment)
        }
      })
      
      setAvailableAppointments(available)
      setUpcomingAppointments(upcoming)
      
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (mechanicId) {
      fetchAppointments()
    }
  }, [mechanicId])

  const handleUpdate = () => {
    fetchAppointments()
    setSelectedAppointment(null)
  }

  const handleSkip = async (appointmentId) => {
    try {
      // Add appointment to skipped list
      const { error } = await supabase
        .from('mechanic_skipped_appointments')
        .insert({
          mechanic_id: mechanicId,
          appointment_id: appointmentId
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Appointment skipped successfully",
      })

      // Refresh appointments
      fetchAppointments()
    } catch (error) {
      console.error('Error skipping appointment:', error)
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
              <p className="text-lg text-gray-600 mt-1">Manage your appointments and quotes</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <Card className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
                </div>
              </Card>
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
            <p className="text-lg text-gray-600 mt-1">Manage your appointments and quotes</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="available" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="available">Available Appointments</TabsTrigger>
                <TabsTrigger value="upcoming">Your Quotes</TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-4">
                {availableAppointments.length > 0 ? (
                  availableAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      mechanicId={mechanicId}
                      isUpcoming={false}
                      selectedAppointment={selectedAppointment}
                      onEdit={setSelectedAppointment}
                      onUpdate={handleUpdate}
                      onCancel={() => setSelectedAppointment(null)}
                      onSkip={() => handleSkip(appointment.id)}
                      price={price}
                      setPrice={setPrice}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      selectedTime={selectedTime}
                      setSelectedTime={setSelectedTime}
                      notes={notes}
                      setNotes={setNotes}
                    />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No available appointments at the moment.</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      mechanicId={mechanicId}
                      isUpcoming={true}
                      selectedAppointment={selectedAppointment}
                      onEdit={setSelectedAppointment}
                      onUpdate={handleUpdate}
                      onCancel={() => setSelectedAppointment(null)}
                      onSkip={() => handleSkip(appointment.id)}
                      price={price}
                      setPrice={setPrice}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      selectedTime={selectedTime}
                      setSelectedTime={setSelectedTime}
                      notes={notes}
                      setNotes={setNotes}
                    />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No upcoming appointments with quotes.</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 