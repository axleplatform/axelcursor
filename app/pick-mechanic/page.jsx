"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, MapPin, X, FileText, CreditCard, User, ArrowLeft, AlertTriangle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getQuotesForAppointment } from "@/lib/mechanic-quotes"

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
 const [showCancelModal, setShowCancelModal] = useState(false)
 const [isCanceling, setIsCanceling] = useState(false)

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
   
   // SIMPLIFIED ACCESS CONTROL FOR ALWAYS-CREATE-USER SYSTEM:
   // With the new system, all appointments have real user_ids (including temporary users for guests)
   // Allow access in these cases:
   // 1. No authenticated user (guest flow) - allow access via URL
   // 2. Authenticated user matches appointment.user_id
   // This supports both guest bookings and logged-in user bookings
   
   console.log('🔍 Access Control Check:', {
    appointmentUserId: appointment.user_id,
    currentUserId: user?.id,
    hasCurrentUser: !!user,
    isGuestFlow: !user,
    accessGranted: !user || user?.id === appointment.user_id
   })
   
   // For guest flow (no authenticated user), allow access via URL
   // For authenticated users, require matching user_id
   if (user && user?.id !== appointment.user_id) {
    console.error('❌ Access denied: Appointment belongs to different user')
    console.error('Appointment user_id:', appointment.user_id)
    console.error('Current user_id:', user?.id)
    setError('You do not have access to this appointment')
    setIsLoading(false)
    return
   }
   
   if (!user) {
    console.log('✅ Guest flow access granted (no authentication required)')
   } else {
    console.log('✅ Authenticated user appointment access granted')
   }
   
   // Use standardized function to fetch quotes (RLS-compatible)
   console.log('🔍 Fetching quotes using standardized function for appointment:', appointmentId)
   const quotes = await getQuotesForAppointment(appointmentId)
   
   console.log('🔍 Quotes retrieved successfully:', {
    appointmentId: appointmentId,
    quotesCount: quotes?.length || 0,
    quotes: quotes
   })
   
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

 const handleBack = () => {
  setShowCancelModal(true)
 }

 const handleCancelAppointment = async () => {
  try {
   setIsCanceling(true)
   
   // Reset appointment status and clear selected mechanic
   const { error: updateError } = await supabase
    .from('appointments')
    .update({ 
     status: 'pending',
     selected_mechanic_id: null,
     selected_quote_id: null
    })
    .eq('id', appointment.id)
   
   if (updateError) throw updateError
   
   // Delete all quotes for this appointment
   const { error: deleteError } = await supabase
    .from('mechanic_quotes')
    .delete()
    .eq('appointment_id', appointment.id)
   
   if (deleteError) {
    console.warn('Error deleting quotes:', deleteError)
   }
   
   toast({
    title: "Appointment Reset",
    description: "Your appointment has been reset. Redirecting to booking page...",
   })
   
   // Redirect back to booking with the appointment details preserved
   setTimeout(() => {
    router.push(`/book-appointment?appointmentId=${appointment.id}`)
   }, 1500)
   
  } catch (error) {
   console.error('Error canceling appointment:', error)
   toast({
    title: "Error",
    description: "Failed to reset appointment. Please try again.",
    variant: "destructive",
   })
  } finally {
   setIsCanceling(false)
   setShowCancelModal(false)
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

 // Main component return
 return (
  <div className="flex flex-col min-h-screen">
   <SiteHeader />
   <main className="flex-grow bg-[#f5f5f5]">
    <div className="container mx-auto py-8 px-4 max-w-7xl">
     {/* Header with Enhanced Back Button and Centered Title */}
     <div className="relative mb-8">
      {/* Enhanced Back Button - Positioned on the left */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
       <button
        onClick={handleBack}
        className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:ring-opacity-50 active:scale-95"
       >
        <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-[#294a46] transition-colors duration-200" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-[#294a46] transition-colors duration-200">
         Back
        </span>
       </button>
      </div>
      
      {/* Centered Page Title */}
      <div className="text-center px-16 sm:px-20 md:px-24">
       <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#294a46] leading-tight">
        Pick Your Mechanic
       </h1>
       <p className="text-lg sm:text-xl text-gray-600 mt-2 font-medium">
        Pick & Pay
       </p>
      </div>
     </div>

     {/* Split-Screen Layout */}
     <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Left Side - Available Mechanics (50% width) */}
      <div className="flex-1 lg:w-1/2">
       <Card className="overflow-hidden h-full bg-white shadow-lg border-0">
        <div className="p-6 border-b bg-gradient-to-r from-[#294a46] to-[#1e3632]">
         <h2 className="text-2xl font-semibold text-white">Available Mechanics</h2>
         <p className="text-sm text-gray-200 mt-1">Choose your preferred mechanic from the options below</p>
        </div>

        <div className="p-6">
         {isLoadingQuotes ? (
          <div className="flex items-center justify-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a46]"></div>
          </div>
         ) : mechanicQuotes && mechanicQuotes.length > 0 ? (
          <div className="space-y-6">
           {mechanicQuotes.map((quote) => (
            <div key={quote.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border border-gray-200">
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
                <span className="flex items-center">
                  <span className="text-base sm:text-lg lg:text-xl leading-none inline-flex items-center justify-center mr-2">⭐</span>
                  {quote.mechanic_profiles?.rating || 'N/A'}
                </span>
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
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
           <Clock className="h-16 w-16 text-gray-400 mx-auto mb-6" />
           <h3 className="text-xl font-medium text-gray-900 mb-3">No Quotes Yet</h3>
           <p className="text-gray-500 text-lg">
            Mechanics are reviewing your request. This page refreshes automatically.
           </p>
          </div>
         )}
        </div>
       </Card>
      </div>

      {/* Right Side - Order Summary (50% width) */}
      <div className="flex-1 lg:w-1/2">
       <Card className="p-0 sticky top-8 h-fit bg-white shadow-lg border-0">
        <div className="p-6 border-b bg-gradient-to-r from-[#1e3632] to-[#294a46]">
         <h2 className="text-2xl font-semibold text-white">Order Summary</h2>
         <p className="text-gray-200 mt-1">Review your appointment details</p>
        </div>

        <div className="p-6">
         <div className="space-y-6">
          <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
           <span className="text-lg leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">📅</span>
           <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-base">Appointment Details</h3>
            <p className="text-sm text-gray-600 mt-1">{formatDate(appointment.appointment_date)}</p>
            <div className="flex items-start mt-2">
             <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
             <p className="text-sm text-gray-500">{appointment.location}</p>
            </div>
           </div>
          </div>

          {appointment.vehicles && (
           <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
            <span className="text-lg leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🚗</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-base">Vehicle</h3>
             <p className="text-sm text-gray-600 mt-1 font-medium">
              {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
             </p>
             {appointment.vehicles.color && (
              <p className="text-sm text-gray-500 mt-1">Color: {appointment.vehicles.color}</p>
             )}
             {appointment.vehicles.vin && (
              <p className="text-sm text-gray-500">VIN: {appointment.vehicles.vin}</p>
             )}
             {appointment.vehicles.mileage && (
              <p className="text-sm text-gray-500">Mileage: {appointment.vehicles.mileage}</p>
             )}
            </div>
           </div>
          )}

          {appointment.selected_services && appointment.selected_services.length > 0 && (
           <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
            <span className="text-lg leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🔧</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-base">Requested Services</h3>
             <ul className="mt-2 space-y-2">
              {appointment.selected_services.map((service, index) => (
               <li key={index} className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-[#294a46] mr-3"></div>
                <span className="text-sm text-gray-600">{service}</span>
               </li>
              ))}
             </ul>
            </div>
           </div>
          )}

          {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 && (
           <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
            <span className="text-lg leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">⚠️</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-base">Reported Issues</h3>
             <ul className="mt-2 space-y-2">
              {appointment.selected_car_issues.map((issue, index) => (
               <li key={index} className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-3"></div>
                <span className="text-sm text-gray-600">{issue}</span>
               </li>
              ))}
             </ul>
            </div>
           </div>
          )}

          {appointment.issue_description && (
           <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
            <FileText className="h-5 w-5 text-[#294a46] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-base">Description</h3>
             <p className="text-sm text-gray-600 mt-2 leading-relaxed">{appointment.issue_description}</p>
            </div>
           </div>
          )}

          <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
           <span className="text-lg leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🔋</span>
           <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-base">Car Status</h3>
            <p className="text-sm text-gray-600 mt-1">
             {appointment.car_runs !== null
              ? appointment.car_runs
               ? "✅ Car is running"
               : "❌ Car is not running"
              : "❓ Car status not specified"}
            </p>
           </div>
          </div>
         </div>

         <div className="mt-6 p-6 border border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-center mb-4">
           <CreditCard className="h-6 w-6 text-[#294a46] mr-3" />
           <h3 className="font-semibold text-gray-700 text-base">Payment Integration Coming Soon</h3>
          </div>
          <div className="space-y-3">
           <div className="h-12 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
           <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
            <div className="h-12 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
           </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">Secure payment processing with Stripe</p>
         </div>
        </div>
       </Card>
      </div>
     </div>
    </div>
   </main>
   <Footer />

   {/* Confirmation Modal */}
   {showCancelModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="flex items-center gap-3 p-6 border-b">
       <AlertTriangle className="h-6 w-6 text-amber-500" />
       <h3 className="text-lg font-semibold text-gray-900">Cancel Appointment Request?</h3>
      </div>
      
      <div className="p-6">
       <p className="text-gray-600 mb-4">
        This will reset your appointment and clear all mechanic quotes. You'll be redirected back to the booking page where you can modify your request.
       </p>
       
       <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
         <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
         <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">What happens when you go back:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
           <li>Appointment status resets to "pending"</li>
           <li>All mechanic quotes are removed</li>
           <li>Your original booking information is preserved</li>
           <li>You can modify and resubmit your request</li>
          </ul>
         </div>
        </div>
       </div>
       
       <div className="flex gap-3 justify-end">
        <Button
         onClick={() => setShowCancelModal(false)}
         variant="outline"
         disabled={isCanceling}
        >
         Stay Here
        </Button>
        <Button
         onClick={handleCancelAppointment}
         disabled={isCanceling}
         className="bg-red-600 hover:bg-red-700 text-white"
        >
         {isCanceling ? (
          <div className="flex items-center gap-2">
           <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
           Processing...
          </div>
         ) : (
          'Yes, Go Back'
         )}
        </Button>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* Add shake animation styles */}
   <style jsx>{`
    @keyframes shake {
     0%, 100% { transform: translateX(0); }
     25% { transform: translateX(-5px); }
     75% { transform: translateX(5px); }
    }
   `}</style>
  </div>
 )
} 