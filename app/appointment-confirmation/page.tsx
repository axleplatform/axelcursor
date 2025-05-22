"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, User, Star } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

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
  selected_quote: {
    id: string
    price: number
    eta: string
    mechanic: {
      id: string
      first_name: string
      last_name: string
      profile_image_url: string | null
      metadata: {
        specialties: string[]
      } | null
      rating: number
      review_count: number
    }
  } | null
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
    if (!appointmentId) {
      setError("No appointment ID provided")
      setIsLoading(false)
      return
    }

    const fetchAppointmentData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch appointment with selected quote and mechanic details
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*),
            selected_quote:selected_quote_id(
              *,
              mechanic:mechanic_id(
                id,
                first_name,
                last_name,
                profile_image_url,
                metadata,
                rating,
                review_count
              )
            )
          `)
          .eq("id", appointmentId)
          .single()

        if (error) throw error

        setAppointment(data)
        console.log("Fetched appointment data:", data)
      } catch (error) {
        console.error("Error fetching appointment data:", error)
        setError("Failed to load appointment data")
        toast({
          title: "Error",
          description: "Failed to load appointment data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentData()

    // Set up real-time subscription for appointment changes
    const appointmentSubscription = supabase
      .channel("appointment-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${appointmentId}`,
        },
        () => {
          fetchAppointmentData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentSubscription)
    }
  }, [appointmentId, toast])

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

              <div className="space-y-6">
                {/* Selected Mechanic */}
                {appointment?.selected_quote?.mechanic && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Mechanic</h2>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {appointment.selected_quote.mechanic.profile_image_url ? (
                          <img
                            src={appointment.selected_quote.mechanic.profile_image_url}
                            alt={`${appointment.selected_quote.mechanic.first_name} ${appointment.selected_quote.mechanic.last_name}`}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {appointment.selected_quote.mechanic.first_name}{" "}
                              {appointment.selected_quote.mechanic.last_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(appointment.selected_quote.mechanic.rating)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                ({appointment.selected_quote.mechanic.review_count} reviews)
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#294a46]">
                              ${appointment.selected_quote.price}
                            </div>
                            <div className="text-sm text-gray-600">ETA: {appointment.selected_quote.eta}</div>
                          </div>
                        </div>

                        {appointment.selected_quote.mechanic.metadata?.specialties && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Specialties</h4>
                            <div className="flex flex-wrap gap-2">
                              {appointment.selected_quote.mechanic.metadata.specialties.map(
                                (specialty: string, index: number) => (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                                  >
                                    {specialty}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Details */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Appointment Details</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">
                        {formatDate(appointment?.appointment_date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">{appointment?.location}</span>
                    </div>

                    {appointment?.vehicles && (
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600">
                          {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                        </span>
                      </div>
                    )}

                    {appointment?.issue_description && (
                      <div className="flex items-start gap-2">
                        <Wrench className="h-5 w-5 text-gray-400 mt-1" />
                        <span className="text-gray-600">{appointment.issue_description}</span>
                      </div>
                    )}

                    {appointment?.selected_services && appointment.selected_services.length > 0 && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-5 w-5 text-gray-400 mt-1" />
                        <div className="flex flex-wrap gap-2">
                          {appointment.selected_services.map((service: string, index: number) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {appointment?.car_runs !== null && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600">
                          Car is {appointment.car_runs ? "running" : "not running"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Service Price</span>
                      <span className="font-semibold">${appointment?.selected_quote?.price}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-[#294a46]">
                          ${appointment?.selected_quote?.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
