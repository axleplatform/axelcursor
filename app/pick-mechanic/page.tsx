"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarIcon, Clock, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, CreditCard, User } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { getQuotesForAppointment, selectQuoteForAppointment, type MechanicQuote } from "@/lib/mechanic-quotes"
import { useToast } from "@/components/ui/use-toast"

// Define types for our data
interface Mechanic {
  id: string
  first_name: string
  last_name: string
  profile_image_url: string | null
  metadata: Record<string, any>
  quote_id: string
  price: number
  eta: string | undefined
  rating: number
  review_count: number
  status: "pending" | "accepted" | "rejected"
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
  mechanics: Mechanic[] | null
}

// Add type for service and issue items
type ServiceItem = string;
type IssueItem = string;

// Add type for specialty items
type SpecialtyItem = string;

// Add type declarations for JSX elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
      main: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
      ul: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>
      li: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>
    }
  }
}

export default function PickMechanicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const { toast } = useToast()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const fetchMechanicQuotes = async (appointmentId: string) => {
      try {
        setIsLoadingQuotes(true)

        // Get quotes for this appointment
        const { success, quotes, error: quotesError } = await getQuotesForAppointment(appointmentId)

        if (!success) {
          throw new Error(quotesError)
        }

        // If no quotes, return early with empty mechanics array
        if (!quotes || quotes.length === 0) {
          setAppointment((prev: Appointment | null) =>
            prev
              ? {
                  ...prev,
                  mechanics: [],
                }
              : null,
          )
          setIsLoadingQuotes(false)
          return
        }

        // Format the quotes data
        const formattedMechanics = quotes.map((quote: MechanicQuote) => {
          const mechanic = quote.mechanic
          if (!mechanic) return null
          return {
            id: mechanic.id,
            first_name: mechanic.first_name || "Unknown",
            last_name: mechanic.last_name || "Mechanic",
            profile_image_url: mechanic.profile_image_url,
            metadata: mechanic.metadata || {},
            quote_id: quote.id,
            price: quote.price,
            eta: quote.eta,
            rating: mechanic.rating || 0,
            review_count: mechanic.review_count || 0,
            status: quote.status,
          }
        }).filter((m): m is Mechanic => m !== null)

        // Update appointment data with mechanic quotes
        setAppointment((prev: Appointment | null) =>
          prev
            ? {
                ...prev,
                mechanics: formattedMechanics,
              }
            : null,
        )

        // If there's a selected quote, select it
        const { data: appointmentData } = await supabase
          .from("appointments")
          .select("selected_quote_id")
          .eq("id", appointmentId)
          .single()

        if (appointmentData?.selected_quote_id) {
          setSelectedMechanic(appointmentData.selected_quote_id)
        }
      } catch (err) {
        console.error("Error fetching mechanic quotes:", err)
        toast({
          title: "Error",
          description: "Failed to load mechanic quotes. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingQuotes(false)
      }
    }

    fetchAppointmentData()

    // Set up real-time subscription for mechanic quotes
    const quotesSubscription = supabase
      .channel("mechanic-quotes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanic_quotes",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        () => {
          // Refresh the quotes when there's a change
          fetchMechanicQuotes(appointmentId!)
        },
      )
      .subscribe()

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
          // Refresh the appointment data when there's a change
          fetchAppointmentData()
        },
      )
      .subscribe()

    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(quotesSubscription)
      supabase.removeChannel(appointmentSubscription)
    }
  }, [appointmentId, toast])

  const handleSelectMechanic = async (quoteId: string) => {
    try {
      setIsProcessing(true)
      const { success, error } = await selectQuoteForAppointment(appointmentId!, quoteId)

      if (!success) {
        throw new Error(error)
      }

      setSelectedMechanic(quoteId)
      toast({
        title: "Success",
        description: "Mechanic selected successfully.",
      })

      // Redirect to appointment confirmation
      router.push(`/appointment-confirmation?appointmentId=${appointmentId}`)
    } catch (error) {
      console.error("Error selecting mechanic:", error)
      toast({
        title: "Error",
        description: "Failed to select mechanic. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getSelectedMechanic = () => {
    if (!appointment?.mechanics || !selectedMechanic) return null
    return appointment.mechanics.find((mechanic: Mechanic) => mechanic.quote_id === selectedMechanic)
  }

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

  // Loading state for the entire page
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow bg-[#f5f5f5]">
          <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#294a46]">Pick Your Mechanic</h1>
              <p className="text-lg text-gray-600 mt-1">Pick & Pay</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
              <div className="md:col-span-3">
                <Card className="overflow-hidden h-full bg-white">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold text-[#294a46]">Available Mechanics</h2>
                  </div>
                  <div className="p-8 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
                    <p className="mt-4 text-gray-600">Loading available mechanics...</p>
                  </div>
                </Card>
              </div>

              <div className="md:col-span-2">
                <Card className="p-0 sticky top-8 h-full bg-white">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold text-[#294a46]">Order Summary</h2>
                  </div>
                  <div className="p-8 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
                    <p className="mt-4 text-gray-600">Loading appointment details...</p>
                  </div>
                </Card>
              </div>
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
              <h1 className="text-3xl font-bold text-[#294a46]">Pick Your Mechanic</h1>
              <p className="text-lg text-gray-600 mt-1">Pick & Pay</p>
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

  // Main content with order summary always visible
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow bg-[#f5f5f5]">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#294a46]">Pick Your Mechanic</h1>
            <p className="text-lg text-gray-600 mt-1">Pick & Pay</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {/* Left Column - Mechanics List (3/5 width) */}
            <div className="md:col-span-3">
              <Card className="overflow-hidden h-full bg-white">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold text-[#294a46]">Available Mechanics</h2>
                </div>

                <div className="space-y-4">
                  {isLoadingQuotes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a46]"></div>
                    </div>
                  ) : appointment?.mechanics && appointment.mechanics.length > 0 ? (
                    appointment.mechanics.map((mechanic) => (
                      <div
                        key={mechanic.quote_id}
                        className={`border rounded-lg p-4 transition-colors ${
                          selectedMechanic === mechanic.quote_id
                            ? "border-[#294a46] bg-[#294a46]/5"
                            : "border-gray-200 hover:border-[#294a46]/50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {mechanic.profile_image_url ? (
                              <img
                                src={mechanic.profile_image_url}
                                alt={`${mechanic.first_name} ${mechanic.last_name}`}
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
                                  {mechanic.first_name} {mechanic.last_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < Math.floor(mechanic.rating)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    ({mechanic.review_count} reviews)
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-2xl font-bold text-[#294a46]">${mechanic.price}</div>
                                <div className="text-sm text-gray-600">ETA: {mechanic.eta}</div>
                              </div>
                            </div>

                            {mechanic.metadata?.specialties && (
                              <div className="mt-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Specialties</h4>
                                <div className="flex flex-wrap gap-2">
                                  {mechanic.metadata.specialties.map((specialty: string, index: number) => (
                                    <span
                                      key={index}
                                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <button
                                onClick={() => handleSelectMechanic(mechanic.quote_id)}
                                disabled={isProcessing || selectedMechanic === mechanic.quote_id}
                                className={`w-full py-2 px-4 rounded-md transition-colors ${
                                  selectedMechanic === mechanic.quote_id
                                    ? "bg-[#294a46] text-white cursor-not-allowed"
                                    : "bg-[#294a46] text-white hover:bg-[#1e3632]"
                                }`}
                              >
                                {isProcessing && selectedMechanic === mechanic.quote_id ? (
                                  <span className="flex items-center justify-center">
                                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                                    Processing...
                                  </span>
                                ) : selectedMechanic === mechanic.quote_id ? (
                                  "Selected"
                                ) : (
                                  "Select Mechanic"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Yet</h3>
                      <p className="text-gray-600">
                        Mechanics are reviewing your appointment. Check back soon for quotes.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Order Summary & Payment (2/5 width) */}
            <div className="md:col-span-2">
              <Card className="p-0 sticky top-8 h-full bg-white">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold text-[#294a46]">Order Summary</h2>
                </div>

                <div className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                      <Calendar className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-gray-700 text-sm">Appointment Details</h3>
                        <p className="text-xs text-gray-600">{formatDate(appointment.appointment_date)}</p>
                        <div className="flex items-start mt-1">
                          <MapPin className="h-3 w-3 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                          <p className="text-xs text-gray-500">{appointment.location}</p>
                        </div>
                      </div>
                    </div>

                    {appointment.vehicles && (
                      <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                        <Car className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-700 text-sm">Vehicle</h3>
                          <p className="text-xs text-gray-600">
                            {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                          </p>
                          {appointment.vehicles.color && (
                            <p className="text-xs text-gray-500">Color: {appointment.vehicles.color}</p>
                          )}
                          {appointment.vehicles.vin && (
                            <p className="text-xs text-gray-500">VIN: {appointment.vehicles.vin}</p>
                          )}
                          {appointment.vehicles.mileage && (
                            <p className="text-xs text-gray-500">Mileage: {appointment.vehicles.mileage}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {appointment.selected_services && appointment.selected_services.length > 0 && (
                      <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                        <Wrench className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-700 text-sm">Requested Services</h3>
                          <ul className="mt-1 space-y-1">
                            {appointment.selected_services.map((service: ServiceItem, index: number) => (
                              <li key={index} className="flex items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                                <span className="text-xs text-gray-600">{service}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 && (
                      <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                        <AlertCircle className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-700 text-sm">Reported Issues</h3>
                          <ul className="mt-1 space-y-1">
                            {appointment.selected_car_issues.map((issue: IssueItem, index: number) => (
                              <li key={index} className="flex items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                                <span className="text-xs text-gray-600">{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {appointment.issue_description && (
                      <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                        <FileText className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-700 text-sm">Description</h3>
                          <p className="text-xs text-gray-600 mt-1">{appointment.issue_description}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                      <Car className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-gray-700 text-sm">Car Status</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {appointment.car_runs !== null
                            ? appointment.car_runs
                              ? "Car is running"
                              : "Car is not running"
                            : "Car status not specified"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedMechanic && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <h3 className="font-medium text-[#294a46] text-sm mb-2">Selected Mechanic</h3>
                      <div className="flex items-center">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-white">
                          <Image
                            src={
                              getSelectedMechanic()?.profile_image_url ||
                              "/placeholder.svg?height=40&width=40&query=mechanic" ||
                              "/placeholder.svg"
                            }
                            alt={
                              getSelectedMechanic()
                                ? `${getSelectedMechanic()?.first_name} ${getSelectedMechanic()?.last_name}`
                                : ""
                            }
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-sm">
                            {getSelectedMechanic()?.first_name} {getSelectedMechanic()?.last_name}
                          </p>
                          <div className="flex items-center">
                            {getSelectedMechanic()?.metadata?.rating && (
                              <React.Fragment>
                                <StarIcon className="h-3 w-3 text-yellow-500 mr-1" />
                                <span className="text-xs text-gray-600">{getSelectedMechanic()?.metadata.rating}</span>
                                <span className="mx-1 text-gray-300">•</span>
                              </React.Fragment>
                            )}
                            <span className="text-xs text-gray-600">
                              {getSelectedMechanic()?.metadata?.experience || "Experienced Mechanic"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="bg-[#294a46] text-white px-3 py-1 rounded-md">
                            <p className="text-2xl font-bold">${getSelectedMechanic()?.price}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
                    <div className="flex items-center justify-center mb-2">
                      <CreditCard className="h-4 w-4 text-[#294a46] mr-2" />
                      <h3 className="font-medium text-gray-700 text-sm">Stripe Card Payment Integration Coming Soon</h3>
                    </div>
                    <div className="h-9 bg-white rounded border border-gray-200 mb-2"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-9 bg-white rounded border border-gray-200"></div>
                      <div className="h-9 bg-white rounded border border-gray-200"></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
