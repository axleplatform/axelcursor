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
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PickMechanicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [appointment, setAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [mechanicQuotes, setMechanicQuotes] = useState([])

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
      
      setAppointment(appointment)
      setMechanicQuotes(quotes || [])
      
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

  const handleSelectMechanic = async (mechanicId, quoteId) => {
    try {
      setIsProcessing(true)
      
      // Get all quotes for comparison analytics
      const selectedQuote = mechanicQuotes.find(q => q.id === quoteId)
      const avgPrice = mechanicQuotes.reduce((sum, q) => sum + q.price, 0) / mechanicQuotes.length
      const lowestPrice = Math.min(...mechanicQuotes.map(q => q.price))
      
      // Update appointment with selection
      const { error } = await supabase
        .from('appointments')
        .update({ 
          selected_mechanic_id: mechanicId,
          selected_quote_id: quoteId,
          status: 'mechanic_selected',
          selected_at: new Date().toISOString()
        })
        .eq('id', appointment.id)
      
      if (error) throw error
      
      // Track selection analytics
      await supabase
        .from('quote_analytics')
        .insert({
          appointment_id: appointment.id,
          selected_quote_id: quoteId,
          total_quotes_received: mechanicQuotes.length,
          selected_price: selectedQuote.price,
          average_price: avgPrice,
          lowest_price: lowestPrice,
          price_rank: mechanicQuotes.sort((a,b) => a.price - b.price).findIndex(q => q.id === quoteId) + 1,
          time_to_selection: new Date() - new Date(appointment.created_at)
        })
      
      toast({
        title: "Success",
        description: "Mechanic selected successfully. Proceeding to payment.",
      })

      // Navigate to payment page
      router.push(`/payment?appointmentId=${appointment.id}`)
      
    } catch (error) {
      console.error('Error selecting mechanic:', error)
      toast({
        title: "Error",
        description: "Failed to select mechanic. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
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
                <div className="p-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center justify-between">
                      <span>Mechanic Quotes</span>
                      {mechanicQuotes.length > 0 && (
                        <span className="text-lg font-normal text-gray-600">
                          {mechanicQuotes.length} quotes received
                        </span>
                      )}
                    </h2>
                    
                    {/* Sort by price option */}
                    {mechanicQuotes.length > 1 && (
                      <div className="mb-4 flex justify-end">
                        <button
                          onClick={() => {
                            const sorted = [...mechanicQuotes].sort((a, b) => a.price - b.price);
                            setMechanicQuotes(sorted);
                          }}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Sort by price ↓
                        </button>
                      </div>
                    )}

                    {mechanicQuotes && mechanicQuotes.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {mechanicQuotes.map((quote) => (
                          <div key={quote.id} className="bg-teal-800 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                            {/* Price header - Most prominent */}
                            <div className="bg-teal-900 px-6 py-4 text-center">
                              <p className="text-sm opacity-80">Quote Price</p>
                              <p className="text-4xl font-bold">${quote.price}</p>
                            </div>
                            
                            {/* Mechanic info section */}
                            <div className="p-6">
                              {/* Mechanic header */}
                              <div className="flex items-center gap-3 mb-4">
                                {/* Profile image */}
                                {quote.mechanic_profiles?.profile_image ? (
                                  <img 
                                    src={quote.mechanic_profiles.profile_image} 
                                    alt={quote.mechanic_profiles.full_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-teal-600"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-teal-700 flex items-center justify-center border-2 border-teal-600">
                                    <span className="text-xl font-semibold">
                                      {quote.mechanic_profiles?.full_name?.charAt(0) || 'M'}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Name and rating */}
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">
                                    {quote.mechanic_profiles?.business_name || quote.mechanic_profiles?.full_name}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm opacity-90">
                                    <span className="text-yellow-400">★</span>
                                    <span>{quote.mechanic_profiles?.rating || 'N/A'}</span>
                                    <span className="opacity-70">•</span>
                                    <span>{quote.mechanic_profiles?.years_of_experience || 0}yrs exp</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Available date/time - Compact */}
                              <div className="bg-teal-700/50 rounded-lg px-4 py-3 mb-4">
                                <p className="text-sm opacity-80">Available</p>
                                <p className="font-medium">
                                  {new Date(quote.eta).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })} at {new Date(quote.eta).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              
                              {/* Key info - Compact list */}
                              <div className="space-y-2 mb-4 text-sm">
                                {/* Specialties */}
                                {quote.mechanic_profiles?.specialties && (
                                  <div className="flex gap-2">
                                    <span className="opacity-70">Specialties:</span>
                                    <span className="font-medium">{quote.mechanic_profiles.specialties}</span>
                                  </div>
                                )}
                                
                                {/* Specialized cars - Only show if exists */}
                                {quote.mechanic_profiles?.specialized_cars && (
                                  <div className="flex gap-2">
                                    <span className="opacity-70">Expert in:</span>
                                    <span className="font-medium">{quote.mechanic_profiles.specialized_cars}</span>
                                  </div>
                                )}
                                
                                {/* Certifications - Abbreviated */}
                                {quote.mechanic_profiles?.certifications && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-xs opacity-90">Certified Professional</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Bio - Truncated */}
                              {quote.mechanic_profiles?.bio && (
                                <p className="text-sm opacity-90 line-clamp-2 mb-4">
                                  {quote.mechanic_profiles.bio}
                                </p>
                              )}
                              
                              {/* Quote notes if any */}
                              {quote.notes && (
                                <div className="bg-teal-700/30 rounded px-3 py-2 mb-4">
                                  <p className="text-xs opacity-80">Mechanic's note:</p>
                                  <p className="text-sm">{quote.notes}</p>
                                </div>
                              )}
                              
                              {/* Select button */}
                              <button
                                onClick={() => handleSelectMechanic(quote.mechanic_id, quote.id)}
                                className="w-full bg-white text-teal-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md"
                              >
                                Select This Mechanic
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // No quotes message - also styled
                      <div className="bg-gray-50 rounded-lg p-12 text-center">
                        <div className="animate-pulse">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Waiting for mechanics to send quotes...
                          </h3>
                          <p className="text-gray-500">
                            Mechanics are reviewing your request. This page refreshes automatically.
                          </p>
                          <div className="mt-4">
                            <div className="inline-flex items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 mr-2"></div>
                              <span className="text-sm text-gray-600">Checking for new quotes...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="p-0 sticky top-8 h-full bg-white">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold text-[#294a46]">Order Summary</h2>
                </div>
                <div className="p-6">
                  {appointment && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden border-2 border-white">
                          <Image
                            src={appointment.vehicles?.image_url || "/placeholder.svg"}
                            alt={`${appointment.vehicles?.year} ${appointment.vehicles?.make} ${appointment.vehicles?.model}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {appointment.vehicles?.year} {appointment.vehicles?.make} {appointment.vehicles?.model}
                          </h3>
                          <p className="text-sm text-gray-500">{appointment.vehicles?.color}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
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

                        {appointment.selected_services && appointment.selected_services.length > 0 && (
                          <div className="flex items-start space-x-3">
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
                          <div className="flex items-start space-x-3">
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
                          <div className="flex items-start space-x-3">
                            <FileText className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
                            <div>
                              <h3 className="font-medium text-gray-700 text-sm">Description</h3>
                              <p className="text-xs text-gray-600 mt-1">{appointment.issue_description}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start space-x-3">
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
                    </div>
                  )}
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