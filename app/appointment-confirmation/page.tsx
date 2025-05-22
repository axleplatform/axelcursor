"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, User, Star, Phone, Check } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"

interface Mechanic {
  id: string
  name: string
  avatar_url: string | null
  rating: number | null
  review_count: number | null
  price: number
  eta: string | null
  specialties: string[] | null
  experience: string | null
}

interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  color: string | null
  vin: string | null
  mileage: string | null
}

interface AppointmentData {
  id: string
  location: string
  appointment_date: string
  status: string
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
  vehicles: {
    id: string
    appointment_id: string
    vin: string | null
    year: number
    make: string
    model: string
    mileage: number | null
    created_at: string
    updated_at: string
  } | null
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: AppointmentData
  old: AppointmentData
}

export default function AppointmentConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const { toast } = useToast()

  const [appointmentData, setAppointmentData] = React.useState<AppointmentData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!appointmentId) {
        console.error("No appointment ID provided")
        setIsLoading(false)
        return
      }

      try {
        // Force refresh the schema cache
        await supabase.rpc("reload_schema_cache")

        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .eq("id", appointmentId)
          .single()

        if (error) throw error

        setAppointmentData(data)
        console.log("Fetched appointment data:", data)
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

    fetchAppointmentData()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("appointment-confirmation")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${appointmentId}`,
        },
        (payload: RealtimePayload) => {
          console.log("Real-time update received:", payload)
          if (payload.eventType === "UPDATE") {
            setAppointmentData(payload.new)
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [appointmentId, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-[#294a46] rounded-full"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!appointmentData) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Appointment Not Found</h1>
            <p className="text-gray-600 mb-4">The appointment you're looking for doesn't exist or has been removed.</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="bg-[#294a46] text-white px-6 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
            >
              Return Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Appointment Confirmed!</h1>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <h2 className="font-medium text-gray-700">Location</h2>
                  <p className="text-gray-600">{appointmentData.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <h2 className="font-medium text-gray-700">Date & Time</h2>
                  <p className="text-gray-600">{formatDate(appointmentData.appointment_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Car className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <h2 className="font-medium text-gray-700">Vehicle</h2>
                  <p className="text-gray-600">
                    {appointmentData.vehicles
                      ? `${appointmentData.vehicles.year} ${appointmentData.vehicles.make} ${appointmentData.vehicles.model}`
                      : "No vehicle information"}
                  </p>
                </div>
              </div>

              {appointmentData.phone_number && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h2 className="font-medium text-gray-700">Phone Number</h2>
                    <p className="text-gray-600">{appointmentData.phone_number}</p>
                  </div>
                </div>
              )}

              {appointmentData.price && (
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-gray-500 mt-1">$</div>
                  <div>
                    <h2 className="font-medium text-gray-700">Price</h2>
                    <p className="text-gray-600">${appointmentData.price}</p>
                  </div>
                </div>
              )}

              {appointmentData.issue_description && (
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-gray-500 mt-1">!</div>
                  <div>
                    <h2 className="font-medium text-gray-700">Issue Description</h2>
                    <p className="text-gray-600">{appointmentData.issue_description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-[#294a46] text-white px-8 py-3 rounded-full hover:bg-[#1e3632] transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
