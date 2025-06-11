"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, CreditCard, User } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { getQuotesForAppointment, selectQuoteForAppointment, acceptQuote } from "@/lib/mechanic-quotes"
import { useToast } from "@/components/ui/use-toast"
import AppointmentCard from "@/components/appointment-card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PickMechanicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [appointment, setAppointment] = useState(null)
  const [selectedMechanic, setSelectedMechanic] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [mechanics, setMechanics] = useState([])

  // Form state
  const [price, setPrice] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState(null)

  const fetchAppointmentData = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const appointmentId = params.get('appointmentId')
      
      console.log('=== FETCH DEBUG ===')
      console.log('Appointment ID:', appointmentId)
      
      if (!appointmentId) {
        setError('No appointment ID provided')
        setIsLoading(false)
        return
      }

      // ABSOLUTELY NO .single() - Handle arrays
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('*, vehicles(*)')
        .eq('id', appointmentId)
      
      console.log('Appointment query:', { data: appointments, error: aptError })
      
      if (aptError) {
        console.error('Query error:', aptError)
        setError('Failed to fetch appointment')
        setIsLoading(false)
        return
      }
      
      if (!appointments || appointments.length === 0) {
        console.error('No appointment found with ID:', appointmentId)
        setError('Appointment not found')
        setIsLoading(false)
        return
      }
      
      const appointment = appointments[0] // Get first item from array
      
      // Verify the appointment belongs to the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (appointment.user_id !== user?.id) {
        console.error('Appointment does not belong to current user')
        setError('You do not have access to this appointment')
        setIsLoading(false)
        return
      }
      
      // Fetch quotes separately - NO .single()
      const { data: quotes, error: quotesError } = await supabase
        .from('mechanic_quotes')
        .select(`
          *,
          mechanic_profiles(*)
        `)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
      
      if (quotesError) {
        console.error('Quotes fetch error:', quotesError)
        throw quotesError
      }
      
      console.log('Quotes:', quotes)
      
      // Format the mechanics data from quotes
      const formattedMechanics = quotes?.map(quote => {
        const mechanic = quote.mechanic_profiles
        console.log('Processing quote:', { quote, mechanic })
        
        if (!mechanic) {
          console.warn('No mechanic profile found for quote:', quote)
          return null
        }
        
        return {
          id: mechanic.id,
          first_name: mechanic.first_name || "Unknown",
          last_name: mechanic.last_name || "Mechanic",
          profile_image_url: mechanic.profile_image_url,
          metadata: {
            ...mechanic.metadata,
            rating: mechanic.rating || 0,
            review_count: mechanic.review_count || 0
          },
          quote_id: quote.id,
          price: quote.price,
          eta: quote.eta,
          status: quote.status,
        }
      }).filter(m => m !== null)
      
      console.log('Formatted mechanics:', formattedMechanics)
      
      setAppointment({
        ...appointment,
        mechanics: formattedMechanics
      })
      setMechanics(formattedMechanics)
      
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
      setIsLoadingQuotes(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentData()
    }
  }, [appointmentId])

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing quotes...')
      fetchAppointmentData()
    }, 8000) // 8 seconds

    return () => clearInterval(interval)
  }, [])

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!appointmentId) return

    // Subscribe to new quotes
    const subscription = supabase
      .channel('mechanic-quotes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mechanic_quotes',
          filter: `appointment_id=eq.${appointmentId}`
        },
        (payload) => {
          console.log('New quote received:', payload)
          fetchAppointmentData() // Refresh when new quote arrives
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [appointmentId])

  const handleSelectMechanic = async (quoteId) => {
    try {
      setIsProcessing(true)
      const { success, error } = await selectQuoteForAppointment(appointmentId, quoteId)

      if (!success) {
        throw new Error(error)
      }

      setSelectedMechanic(quoteId)
      toast({
        title: "Success",
        description: "Mechanic selected successfully.",
      })

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

  const handleAcceptQuote = async (quoteId) => {
    if (!appointmentId) {
      toast({
        title: "Error",
        description: "No appointment ID found",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const { success, error } = await acceptQuote(quoteId, appointmentId)

      if (!success) {
        throw new Error(error)
      }

      toast({
        title: "Success",
        description: "Quote accepted successfully!",
      })

      // Navigate to appointment confirmation page
      router.push(`/appointment-confirmation?appointmentId=${appointmentId}`)
    } catch (error) {
      console.error("Error accepting quote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getSelectedMechanic = () => {
    if (!appointment?.mechanics || !selectedMechanic) return null
    return appointment.mechanics.find(mechanic => mechanic.quote_id === selectedMechanic)
  }

  const formatDate = (dateString) => {
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

                <div className="space-y-4">
                  {isLoadingQuotes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a46]"></div>
                    </div>
                  ) : appointment?.mechanics && appointment.mechanics.length > 0 ? (
                    appointment.mechanics.map(mechanic => (
                      <AppointmentCard
                        key={mechanic.quote_id}
                        appointment={appointment}
                        mechanicId={mechanic.quote_id}
                        isUpcoming={false}
                        selectedAppointment={selectedAppointment}
                        onEdit={setSelectedAppointment}
                        onUpdate={() => {}}
                        onCancel={() => setSelectedAppointment(null)}
                        onSkip={() => {}}
                        onSubmit={() => handleSelectMechanic(mechanic.quote_id)}
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
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Yet</h3>
                      <p className="text-gray-500">
                        Mechanics will start sending quotes soon. Check back later!
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

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
                              <React.Fragment>
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
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