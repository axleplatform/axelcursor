"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarIcon, Clock, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, CreditCard } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { getQuotesForAppointment, selectQuoteForAppointment } from "@/lib/mechanic-quotes"
import { useToast } from "@/components/ui/use-toast"

// Define types for our data
interface Mechanic {
  id: string
  first_name: string
  last_name: string
  profile_image_url: string | null
  metadata: any
  quote_id: string
  price: number
  eta: string | null
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

export default function PickMechanicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const { toast } = useToast()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch appointment data and mechanic quotes
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

        // Fetch appointment data
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select(`
            *,
            vehicles(*)
          `)
          .eq("id", appointmentId)
          .single()

        if (appointmentError) throw appointmentError

        // Set the appointment data first (without quotes)
        // This ensures the order summary is visible immediately
        setAppointment({
          ...appointmentData,
          mechanics: [],
        })

        // Now we can load the quotes separately
        await fetchMechanicQuotes(appointmentId)
      } catch (err) {
        console.error("Error fetching appointment data:", err)
        setError("Failed to load appointment data")
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
          setAppointment((prev) =>
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
        const formattedMechanics = quotes.map((quote) => {
          const mechanic = quote.mechanic
          return {
            id: mechanic.id,
            first_name: mechanic.first_name || "Unknown",
            last_name: mechanic.last_name || "Mechanic",
            profile_image_url: mechanic.profile_image_url,
            metadata: mechanic.metadata || {},
            quote_id: quote.id,
            price: quote.price,
            eta: quote.eta,
          }
        })

        // Update appointment data with mechanic quotes
        setAppointment((prev) =>
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
        // Don't set the main error state, just log it
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

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(quotesSubscription)
    }
  }, [appointmentId])

  const handleSelectMechanic = (quoteId: string) => {
    setSelectedMechanic(quoteId)
  }

  const getSelectedMechanic = () => {
    if (!appointment?.mechanics || !selectedMechanic) return null
    return appointment.mechanics.find((mechanic) => mechanic.quote_id === selectedMechanic)
  }

  const handleProceedToPayment = async () => {
    if (!appointmentId || !selectedMechanic) return

    try {
      setIsProcessing(true)

      // Select the quote for this appointment
      const { success, error } = await selectQuoteForAppointment(appointmentId, selectedMechanic)

      if (!success) {
        throw new Error(error)
      }

      // Navigate to payment confirmation page
      router.push(`/appointment-confirmation?appointmentId=${appointmentId}`)
    } catch (err) {
      console.error("Error updating appointment:", err)
      setError("Failed to process selection")

      toast({
        title: "Error",
        description: "Failed to process your selection. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
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

                {isLoadingQuotes ? (
                  // Loading state for mechanics section
                  <div className="p-8 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
                    <p className="mt-4 text-gray-600">Waiting for mechanic quotes...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Mechanics are reviewing your request. This page will update automatically when quotes arrive.
                    </p>
                  </div>
                ) : appointment.mechanics && appointment.mechanics.length > 0 ? (
                  // Mechanics list when quotes are available
                  <div className="p-4 space-y-3">
                    {appointment.mechanics.map((mechanic) => (
                      <Card
                        key={mechanic.quote_id}
                        className={`overflow-hidden transition-all bg-[#294a46] ${
                          selectedMechanic === mechanic.quote_id
                            ? "ring-2 ring-white shadow-md"
                            : "hover:shadow-md border-[#294a46]"
                        }`}
                        onClick={() => handleSelectMechanic(mechanic.quote_id)}
                      >
                        <div className="flex items-center p-3">
                          {/* Profile Image */}
                          <div className="relative h-14 w-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white">
                            <Image
                              src={mechanic.profile_image_url || "/placeholder.svg?height=56&width=56&query=mechanic"}
                              alt={`${mechanic.first_name} ${mechanic.last_name}`}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Mechanic Info - Left Side */}
                          <div className="ml-3 flex-grow">
                            <h3 className="text-base font-semibold text-white truncate">
                              {mechanic.first_name} {mechanic.last_name}
                            </h3>
                            <div className="flex items-center mt-0.5">
                              {mechanic.metadata?.rating && (
                                <>
                                  <div className="flex items-center">
                                    <StarIcon className="h-3.5 w-3.5 text-yellow-400 mr-1" />
                                    <span className="text-sm font-medium text-white">{mechanic.metadata.rating}</span>
                                  </div>
                                  {mechanic.metadata?.review_count && (
                                    <span className="text-xs text-gray-200 ml-1">
                                      ({mechanic.metadata.review_count})
                                    </span>
                                  )}
                                  <span className="mx-1.5 text-gray-400">•</span>
                                </>
                              )}
                              <span className="text-xs text-gray-200">
                                {mechanic.metadata?.experience || "Experienced Mechanic"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {mechanic.metadata?.specialties &&
                                mechanic.metadata.specialties.slice(0, 3).map((specialty: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="px-1.5 py-0 text-xs bg-[#1e3632] text-white border-[#1e3632] font-medium"
                                  >
                                    {specialty}
                                  </Badge>
                                ))}
                            </div>
                          </div>

                          {/* Price and ETA - Right Side */}
                          <div className="flex flex-col items-end ml-2 mr-2">
                            <div className="bg-[#1e3632] px-3 py-1 rounded-md">
                              <p className="text-2xl font-bold text-white">${mechanic.price}</p>
                            </div>
                            {mechanic.eta && (
                              <div className="flex items-center mt-1.5 bg-[#1e3632] px-2 py-0.5 rounded text-white">
                                <Clock className="h-3.5 w-3.5 mr-1 text-gray-200" />
                                <span className="text-sm font-medium">{mechanic.eta}</span>
                              </div>
                            )}
                          </div>

                          {/* Selection Indicator */}
                          <div className="flex-shrink-0">
                            <div
                              className={`w-5 h-5 rounded-full border-2 ${
                                selectedMechanic === mechanic.quote_id ? "border-white bg-white" : "border-gray-200"
                              }`}
                            >
                              {selectedMechanic === mechanic.quote_id && (
                                <div className="h-full w-full flex items-center justify-center">
                                  <div className="h-2 w-2 rounded-full bg-[#294a46]"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // No quotes available yet
                  <div className="p-8 flex flex-col items-center justify-center">
                    <Clock className="h-12 w-12 text-[#294a46] mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Quotes Yet</h3>
                    <p className="text-gray-600 text-center mb-2">
                      Mechanics are reviewing your request. Please wait for quotes to arrive.
                    </p>
                    <p className="text-sm text-gray-500 text-center">
                      This page will update automatically when mechanics respond.
                    </p>
                  </div>
                )}
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
                            {appointment.selected_services.map((service, index) => (
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
                            {appointment.selected_car_issues.map((issue, index) => (
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
                              <>
                                <StarIcon className="h-3 w-3 text-yellow-500 mr-1" />
                                <span className="text-xs text-gray-600">{getSelectedMechanic()?.metadata.rating}</span>
                                <span className="mx-1 text-gray-300">•</span>
                              </>
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

                  <Button
                    className="w-full mt-4 bg-[#294a46] hover:bg-[#1e3632] text-white"
                    size="default"
                    disabled={!selectedMechanic || isProcessing}
                    onClick={handleProceedToPayment}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                        Processing...
                      </span>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
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
