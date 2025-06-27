"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, MapPin, X, FileText, CreditCard, User } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PickMechanicPage() {
 console.log("🔍 PickMechanicPage component mounting...")
 
 const router = useRouter()
 const searchParams = useSearchParams()
 const { toast } = useToast()
 const supabase = createClientComponentClient()

 const [appointment, setAppointment] = useState(null)
 const [isLoading, setIsLoading] = useState(true)
 const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
 const [isProcessing, setIsProcessing] = useState(false)
 const [error, setError] = useState(null)
 const [mechanicQuotes, setMechanicQuotes] = useState([])

 // Get appointmentId from searchParams
 const appointmentId = searchParams?.get("appointmentId")
 
 console.log("🔍 AppointmentId from searchParams:", appointmentId)

 const fetchAppointmentData = async () => {
  try {
   console.log('=== FETCH DEBUG ===')
   console.log('Appointment ID:', appointmentId)
   
   if (!appointmentId) {
    console.log('No appointment ID provided')
    setError('No appointment ID provided')
    setIsLoading(false)
    return
   }

   // ABSOLUTELY NO .single() - Handle arrays
   const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('*, vehicles!fk_appointment_id(*)')
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
   
   // Verify the appointment belongs to the current user OR allow guest access
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user?.id, 'Appointment user:', appointment.user_id)
   
   // Allow access if user matches OR if no user (guest flow)
   if (user?.id && appointment.user_id !== user.id) {
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
  console.log("🔍 useEffect triggered with appointmentId:", appointmentId)
  if (appointmentId) {
   fetchAppointmentData()
  } else {
   console.log("🔍 No appointmentId, setting loading to false")
   setIsLoading(false)
  }
 }, [appointmentId])

 // Auto-refresh every 8 seconds
 useEffect(() => {
  if (!appointmentId) return
  
  const interval = setInterval(() => {
   console.log('Auto-refreshing quotes...')
   fetchAppointmentData()
  }, 8000) // 8 seconds

  return () => clearInterval(interval)
 }, [appointmentId])

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

 // Show loading state
 if (isLoading) {
  console.log("🔍 Showing loading state...")
  return (
   <div className="flex flex-col min-h-screen">
    <SiteHeader />
    <main className="flex-1 flex items-center justify-center">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
      <p className="text-gray-600">Loading mechanic quotes...</p>
     </div>
    </main>
    <Footer />
   </div>
  )
 }

 // Show error state
 if (error) {
  console.log("🔍 Showing error state:", error)
  return (
   <div className="flex flex-col min-h-screen">
    <SiteHeader />
    <main className="flex-1 flex items-center justify-center">
     <div className="text-center">
      <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={() => router.push('/')}>
       Return to Home
      </Button>
     </div>
    </main>
    <Footer />
   </div>
  )
 }

 const handleSelectMechanic = async (mechanicId, quoteId) => {
  try {
   setIsProcessing(true)
   
   // Update appointment with selected mechanic
   const { error } = await supabase
    .from('appointments')
    .update({ 
     selected_mechanic_id: mechanicId,
     selected_quote_id: quoteId,
     status: 'confirmed'
    })
    .eq('id', appointment.id)
   
   if (error) throw error
   
   toast({
    title: "Success",
    description: "Mechanic selected successfully.",
   })

   // Navigate to confirmation page
   router.push(`/appointment-confirmation?appointmentId=${appointment.id}`)
   
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
         ) : mechanicQuotes && mechanicQuotes.length > 0 ? (
          <div className="space-y-4">
           {mechanicQuotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
             {/* Mechanic profile header */}
             <div className="flex items-start gap-4 mb-4">
              {/* Profile image */}
              {quote.mechanic_profiles?.profile_image_url ? (
               <img 
                src={quote.mechanic_profiles.profile_image_url} 
                alt={quote.mechanic_profiles.full_name}
                className="w-16 h-16 rounded-full object-cover"
               />
              ) : (
               <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-2xl text-gray-500">
                 {quote.mechanic_profiles?.first_name?.charAt(0) || 'M'}
                </span>
               </div>
              )}
              
              {/* Mechanic info */}
              <div className="flex-1">
               <h3 className="text-xl font-semibold">
                {quote.mechanic_profiles?.business_name || `${quote.mechanic_profiles?.first_name} ${quote.mechanic_profiles?.last_name}`}
               </h3>
               <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>⭐ {quote.mechanic_profiles?.rating || 'N/A'}</span>
                <span>• {quote.mechanic_profiles?.review_count || 0} reviews</span>
               </div>
              </div>
              
              {/* Quote price */}
              <div className="text-right">
               <p className="text-sm text-gray-500">Quote</p>
               <p className="text-3xl font-bold text-green-600">${quote.price}</p>
              </div>
             </div>
             
             {/* Date and time */}
             <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">
               <span className="font-medium">Available:</span> {new Date(quote.eta).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
               })}
              </p>
             </div>
             
             {/* Mechanic details */}
             <div className="space-y-3 mb-4">
              {/* Bio */}
              {quote.mechanic_profiles?.bio && (
               <div>
                <p className="text-sm font-medium text-gray-700">About:</p>
                <p className="text-sm text-gray-600">{quote.mechanic_profiles.bio}</p>
               </div>
              )}
              
              {/* Quote notes */}
              {quote.notes && (
               <div>
                <p className="text-sm font-medium text-gray-700">Additional notes:</p>
                <p className="text-sm text-gray-600">{quote.notes}</p>
               </div>
              )}
             </div>
             
             {/* Select button */}
             <button
              onClick={() => handleSelectMechanic(quote.mechanic_id, quote.id)}
              disabled={isProcessing}
              className="w-full bg-[#294a46] text-white py-3 px-4 rounded-md hover:bg-[#1e3632] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
             >
              {isProcessing ? 'Selecting...' : 'Select This Mechanic'}
             </button>
            </div>
           ))}
          </div>
         ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
           <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
           <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Yet</h3>
           <p className="text-gray-500">
            Mechanics are reviewing your request. This page refreshes automatically.
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
           <div className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0">📅</div>
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
            <div className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0">🚗</div>
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
            <div className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0">🔧</div>
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
            <div className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0">🚗</div>
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
           <div className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0">🚗</div>
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
