"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import AppointmentCard from "@/components/appointment-card"

export default function PickMechanic() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [appointmentData, setAppointmentData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const appointmentId = searchParams.get("id")

  // Create Supabase client
  const supabase = createClient()

  useEffect(() => {
    if (!appointmentId) {
      router.push("/")
      return
    }

    fetchAppointmentData()
  }, [appointmentId, router])

  const fetchAppointmentData = async () => {
    try {
      setIsLoading(true)

      // First get the appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (error) {
        console.error('Error fetching appointment:', error)
        throw error
      }

      if (appointment) {
        // Then get the vehicle
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('appointment_id', appointmentId)
          .single()

        if (vehicleError) {
          console.error('Error fetching vehicle:', vehicleError)
          throw vehicleError
        }

        // Get quotes with mechanic profiles
        const { data: quotes, error: quotesError } = await supabase
          .from('mechanic_quotes')
          .select(`
            *,
            mechanic:mechanic_id (
              *,
              profile:mechanic_profiles (*)
            )
          `)
          .eq('appointment_id', appointmentId)

        if (quotesError) {
          console.error('Error fetching quotes:', quotesError)
          throw quotesError
        }

        // Combine all the data
        const appointmentWithData = {
          ...appointment,
          vehicle: vehicle || null,
          mechanic_quotes: quotes || []
        }

        setAppointmentData(appointmentWithData)
      }
    } catch (error) {
      console.error("Error fetching appointment data:", error)
      toast({
        title: "Error",
        description: "Failed to load appointment details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Choose Your Mechanic</h1>
              <p className="text-lg text-gray-600 mt-1">Select from available mechanics</p>
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

  if (!appointmentData) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#294a46]">Appointment Not Found</h1>
              <p className="text-lg text-gray-600 mt-1">The appointment you're looking for doesn't exist.</p>
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
            <h1 className="text-3xl font-bold text-[#294a46]">Choose Your Mechanic</h1>
            <p className="text-lg text-gray-600 mt-1">Select from available mechanics</p>
          </div>

          <div className="space-y-8">
            {appointmentData.mechanic_quotes.map((quote: any) => (
              <AppointmentCard
                key={quote.id}
                appointment={appointmentData}
                quote={quote}
                onSelect={() => {
                  // Handle quote selection
                  router.push(`/appointments/${appointmentId}/confirm?quote_id=${quote.id}`)
                }}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 