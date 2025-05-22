"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Car, Wrench, AlertCircle, FileText } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"

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

interface Appointment {
  id: string
  appointment_date: string
  location: string
  issue_description: string | null
  phone_number: string | null
  car_runs: boolean | null
  selected_services: string[] | null
  selected_car_issues: string[] | null
  vehicles: Vehicle | null
  selected_mechanic: Mechanic | null
}

export default function AppointmentConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch appointment data
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!appointmentId) {
        setError("No appointment ID provided")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Force refresh the schema cache
        await supabase.rpc("reload_schema_cache")

        // Fetch appointment data
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*),
            selected_quote_id
          `)
          .eq("id", appointmentId)
          .single()

        if (appointmentError) throw appointmentError

        // Fetch selected mechanic quote
        if (appointmentData.selected_quote_id) {
          const { data: quoteData, error: quoteError } = await supabase
            .from("mechanic_quotes")
            .select(`
              *,
              mechanics(id, name, avatar_url, rating, review_count, specialties, experience)
            `)
            .eq("id", appointmentData.selected_quote_id)
            .single()

          if (quoteError) throw quoteError

          // Format mechanic data
          const selectedMechanic = {
            id: quoteData.mechanics.id,
            name: quoteData.mechanics.name,
            avatar_url: quoteData.mechanics.avatar_url,
            rating: quoteData.mechanics.rating,
            review_count: quoteData.mechanics.review_count,
            price: quoteData.price,
            eta: quoteData.eta,
            specialties: quoteData.mechanics.specialties,
            experience: quoteData.mechanics.experience,
          }

          // Update appointment data with selected mechanic
          appointmentData.selected_mechanic = selectedMechanic
        }

        setAppointment(appointmentData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load appointment data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentData()
  }, [appointmentId])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Appointment Confirmation</h1>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="p-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
                <p className="mt-4 text-gray-600">Loading appointment details...</p>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Error state
  if (error || !appointment) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Appointment Confirmation</h1>
            </div>

            <div className="max-w-md mx-auto">
              <Card className="p-6 bg-white">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
                  <p className="text-gray-600 mb-4">{error || "Failed to load appointment data"}</p>
                  <Button onClick={() => router.push("/")} className="bg-[#294a46] hover:bg-[#1e3632] text-white">
                    Return to Home
                  </Button>
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
            <h1 className="text-3xl font-bold text-[#294a46]">Appointment Confirmation</h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="p-6 bg-white">
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your Appointment is Confirmed!</h2>
                <p className="text-gray-600">
                  Thank you for booking with Axle. Your mechanic is looking forward to helping you.
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                  <Calendar className="h-5 w-5 text-[#294a46] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-700">Appointment Details</h3>
                    <p className="text-gray-600">{formatDate(appointment.appointment_date)}</p>
                    <div className="flex items-start mt-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                      <p className="text-gray-500">{appointment.location}</p>
                    </div>
                  </div>
                </div>

                {appointment.selected_mechanic && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-[#294a46]">
                        <Image
                          src={
                            appointment.selected_mechanic.avatar_url ||
                            "/placeholder.svg?height=48&width=48&query=mechanic"
                          }
                          alt={appointment.selected_mechanic.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Your Mechanic</h3>
                      <p className="text-gray-600 font-medium">{appointment.selected_mechanic.name}</p>
                      <div className="flex items-center mt-1">
                        <p className="text-[#294a46] font-bold text-lg">${appointment.selected_mechanic.price}</p>
                        {appointment.selected_mechanic.eta && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <p className="text-gray-600">ETA: {appointment.selected_mechanic.eta}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {appointment.vehicles && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                    <Car className="h-5 w-5 text-[#294a46] mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">Vehicle</h3>
                      <p className="text-gray-600">
                        {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                      </p>
                      {appointment.vehicles.color && (
                        <p className="text-gray-500">Color: {appointment.vehicles.color}</p>
                      )}
                    </div>
                  </div>
                )}

                {appointment.selected_services && appointment.selected_services.length > 0 && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                    <Wrench className="h-5 w-5 text-[#294a46] mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">Requested Services</h3>
                      <ul className="mt-1 space-y-1">
                        {appointment.selected_services.map((service, index) => (
                          <li key={index} className="flex items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                            <span className="text-gray-600">{service}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {appointment.issue_description && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                    <FileText className="h-5 w-5 text-[#294a46] mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">Description</h3>
                      <p className="text-gray-600 mt-1">{appointment.issue_description}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">What's Next?</h3>
                <p className="text-gray-600 mb-2">
                  Your mechanic will contact you shortly to confirm the appointment details. You'll receive updates via
                  email and text message.
                </p>
                <p className="text-gray-600">If you need to make any changes to your appointment, please contact us.</p>
              </div>

              <div className="mt-6 flex justify-center">
                <Button onClick={() => router.push("/")} className="bg-[#294a46] hover:bg-[#1e3632] text-white">
                  Return to Home
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
