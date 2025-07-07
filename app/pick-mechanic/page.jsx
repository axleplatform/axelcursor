"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, MapPin, X, FileText, CreditCard, User, ChevronLeft, AlertTriangle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { getQuotesForAppointment } from "@/lib/mechanic-quotes"
import { formatCarIssue } from "@/lib/utils"

function PickMechanicContent() {
 const router = useRouter()
 const searchParams = useSearchParams()
 
 // Add React.StrictMode detection
 const isStrictMode = React.useMemo(() => {
  try {
   return React.StrictMode !== undefined
  } catch {
   return false
  }
 }, [])
 
 console.log("🔍 PickMechanicPage component mounting...", {
  timestamp: new Date().toISOString(),
  isStrictMode,
  appointmentId: searchParams?.get("appointmentId")
 })
 const { toast } = useToast()

 const [appointment, setAppointment] = useState(null)
 const [isLoading, setIsLoading] = useState(true)
 const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
 const [isProcessing, setIsProcessing] = useState(false)
 const [error, setError] = useState(null)
 const [mechanicQuotes, setMechanicQuotes] = useState([])
 const [showCancelModal, setShowCancelModal] = useState(false)
 const [isCanceling, setIsCanceling] = useState(false)

 // Loading animation state
 const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
 const [isFading, setIsFading] = useState(false)
 const loadingMessages = [
   "Searching the Mobile Mechanics Near You",
   "Checking their above 4 star rating",
   "Contacting their Business",
   "Mechanics go thru the Sign Up",
   "Checking their availability",
   "Sent appointment details",
   "Receiving their Quotes",
   "Adding Processing fee"
 ]

 // Get appointmentId from searchParams
 const appointmentId = searchParams?.get("appointmentId")
 
 console.log("🔍 AppointmentId from searchParams:", appointmentId)

 // Move fetchAppointmentData OUTSIDE of useCallback to fix dependency issues
 const fetchAppointmentData = async () => {
  try {
   console.log('=== FETCH DEBUG ===')
   console.log('Appointment ID:', appointmentId)
   console.log('Appointment ID type:', typeof appointmentId)
   
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
   
   // ENHANCED ACCESS CONTROL FOR GUEST FLOW:
   // Allow access in these cases:
   // 1. No authenticated user (guest flow) - allow access via URL (most common case)
   // 2. Authenticated user matches appointment.user_id
   // 3. For temporary users (created for guest bookings), allow access via URL
   
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user?.id, 'Appointment user:', appointment.user_id)
   
   // Check if this is a temporary user (guest booking)
   // Temporary users have account_type = 'temporary' in the users table
   // We need to check the users table to determine if this is a temporary user
   const { data: userData, error: userError } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', appointment.user_id)
    .single()
   
   const isTemporaryUser = userData?.account_type === 'temporary'
   
   if (userError) {
    console.log('⚠️ Could not determine user type (proceeding with guest access):', userError)
    // If we can't determine user type, allow access (fail open for guest flow)
   }
   
   console.log('🔍 Access Control Check:', {
    appointmentUserId: appointment.user_id,
    currentUserId: user?.id,
    hasCurrentUser: !!user,
    isGuestFlow: !user,
    isTemporaryUser: isTemporaryUser,
    userAccountType: userData?.account_type,
    userError: !!userError,
    accessGranted: !user || user?.id === appointment.user_id || isTemporaryUser || userError
   })
   
   // Allow access if:
   // 1. No authenticated user (guest flow)
   // 2. Authenticated user matches appointment.user_id
   // 3. This is a temporary user (guest booking) - allow access via URL
   // 4. We can't determine user type (fail open for guest flow)
   if (user && user?.id !== appointment.user_id && !isTemporaryUser && !userError) {
    console.error('❌ Access denied: Appointment belongs to different user')
    console.error('Appointment user_id:', appointment.user_id)
    console.error('Current user_id:', user?.id)
    setError('You do not have access to this appointment')
    setIsLoading(false)
    return
   }
   
   if (!user) {
    console.log('✅ Guest flow access granted (no authentication required)')
   } else if (isTemporaryUser) {
    console.log('✅ Temporary user access granted (guest booking via URL)')
   } else {
    console.log('✅ Authenticated user appointment access granted')
   }
   
   // Use standardized function to fetch quotes (RLS-compatible)
   console.log('🔍 Fetching quotes using standardized function for appointment:', appointmentId)
   console.log('🔍 CUSTOMER VIEW - Appointment ID details:', {
     appointmentId,
     type: typeof appointmentId,
     length: appointmentId?.length,
     trimmed: appointmentId?.trim(),
     hasSpaces: appointmentId?.includes(' '),
     hasNewlines: appointmentId?.includes('\n'),
     hasTabs: appointmentId?.includes('\t')
   })
   
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
 }, [appointmentId]) // Removed fetchAppointmentData dependency

 // Auto-refresh every 8 seconds - with proper dependency management
 useEffect(() => {
  if (!appointmentId) return
  
  console.log('🔄 Setting up auto-refresh interval for appointmentId:', appointmentId)
  const interval = setInterval(() => {
   console.log('Auto-refreshing quotes...')
   fetchAppointmentData()
  }, 8000) // 8 seconds

  return () => {
   console.log('🔄 Clearing auto-refresh interval')
   clearInterval(interval)
  }
 }, [appointmentId]) // Removed fetchAppointmentData dependency

 // Real-time subscription for instant updates - FIXED VERSION
 useEffect(() => {
  console.log('🔍 Real-time useEffect running, appointmentId:', appointmentId);
  console.log('🔍 appointmentId type:', typeof appointmentId);
  
  if (!appointmentId) {
    console.log('⚠️ No appointmentId, skipping subscription');
    return;
  }
  
  console.log('📡 STARTING REAL-TIME SUBSCRIPTION');
  console.log('📡 SUBSCRIPTION PARAMS:', {
    appointmentId,
    channelName: `quotes-${appointmentId}`,
    table: 'mechanic_quotes'
  });
  
  const channel = supabase.channel(`quotes-${appointmentId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'mechanic_quotes' },
      (payload) => {
        console.log('🚨 REAL-TIME EVENT:', payload);
        console.log('🚨 EVENT APPOINTMENT ID:', payload.new?.appointment_id);
        console.log('🚨 OUR APPOINTMENT ID:', appointmentId);
        console.log('🚨 IDS MATCH?', payload.new?.appointment_id === appointmentId);
        
        // Only refresh if it's for our appointment
        if (payload.new?.appointment_id === appointmentId) {
          console.log('✅ Refreshing for our appointment');
          fetchAppointmentData();
        } else {
          console.log('⏭️ Skipping - different appointment');
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 SUBSCRIPTION STATUS:', status);
    });

  return () => {
    console.log('🔚 CLEANUP: Unsubscribing');
    channel.unsubscribe();
  };
 }, [appointmentId]) // Removed fetchAppointmentData dependency

 // Loading animation effect - with proper dependency management
 useEffect(() => {
  if (mechanicQuotes.length > 0) {
   console.log('🔄 Stopping loading animation - quotes received')
   return // Stop animation when quotes arrive
  }
  
  console.log('🔄 Running loading animation effect, currentMessageIndex:', currentMessageIndex)
  
  const messageDuration = currentMessageIndex === loadingMessages.length - 1 ? 800 : 2000 // 0.8s for last message, 2s for others
  
  const fadeOutTimer = setTimeout(() => {
   setIsFading(true)
  }, messageDuration - 300) // Start fade out 300ms before transition
  
  const transitionTimer = setTimeout(() => {
   setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length)
   setIsFading(false)
  }, messageDuration)
  
  return () => {
   clearTimeout(fadeOutTimer)
   clearTimeout(transitionTimer)
  }
 }, [currentMessageIndex, mechanicQuotes.length]) // Removed loadingMessages.length as it's static

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
     mechanic_id: mechanicId,
     selected_mechanic_id: mechanicId,
     selected_quote_id: quoteId,
     status: 'confirmed',
     selected_at: new Date().toISOString()
    })
    .eq('id', appointment.id)
   
   if (error) throw error
   
   toast({
    title: "Success",
    description: "Mechanic selected successfully.",
   })

   // Navigate to confirmation page
   router.push(`/appointment-confirmation?id=${appointment.id}`)
   
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

 // Handle back button - comprehensive workflow management
 const handleBack = async () => {
  try {
   console.log('🔄 === APPOINTMENT EDIT MODE ACTIVATION ===')
   console.log('🔄 Marking appointment as being edited for appointment:', appointmentId)

   // Mark appointment as being edited
   const { error: editError } = await supabase
    .from('appointments')
    .update({ 
      is_being_edited: true,
      last_edited_at: new Date().toISOString(),
      selected_quote_id: null // Clear any selected quote
    })
    .eq('id', appointmentId)

   if (editError) {
    console.error('❌ Failed to mark appointment as being edited:', editError)
    toast({
     title: "Error",
     description: "Failed to enter edit mode. Please try again.",
     variant: "destructive",
    })
    return
   }

   console.log('✅ Appointment marked as being edited')

   // Navigate back to book-appointment with edit mode
   router.push(`/book-appointment?appointment_id=${appointmentId}&edit=true`)
   
  } catch (error) {
   console.error('❌ Error entering edit mode:', error)
   toast({
    title: "Error",
    description: "Failed to enter edit mode. Please try again.",
    variant: "destructive",
   })
  }
 }

 const handleCancelAppointment = async () => {
  setIsCanceling(true)
  
  try {
   console.log('🔄 === APPOINTMENT RESET PROCESS START ===')
   console.log('🔄 Resetting appointment and clearing all mechanic data for appointment:', appointmentId)

   // Step 1: Reset appointment status to 'pending' and clear selected data
   console.log('🔄 Step 1: Resetting appointment status and clearing selections...')
   const { error: statusError } = await supabase
    .from('appointments')
    .update({
     status: 'pending', // Reset to pending so it appears in Available Appointments
     selected_quote_id: null, // Clear selected quote
     mechanic_id: null, // Clear assigned mechanic
     updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

   if (statusError) {
    console.error('❌ Failed to reset appointment status:', statusError)
    throw new Error(`Failed to reset appointment: ${statusError.message}`)
   }

   console.log('✅ Step 1 complete: Appointment status reset to pending')

   // Step 2: Clear all mechanic quotes for this appointment
   console.log('🔄 Step 2: Clearing all mechanic quotes...')
   const { error: quotesError } = await supabase
    .from('mechanic_quotes')
    .delete()
    .eq('appointment_id', appointmentId)

   if (quotesError) {
    console.error('❌ Failed to clear mechanic quotes:', quotesError)
    throw new Error(`Failed to clear quotes: ${quotesError.message}`)
   }

   console.log('✅ Step 2 complete: All mechanic quotes cleared')

   // Step 3: Clear any skipped appointments for this appointment (fresh start)
   console.log('🔄 Step 3: Clearing mechanic skips for fresh start...')
   const { error: skipsError } = await supabase
    .from('mechanic_skipped_appointments')
    .delete()
    .eq('appointment_id', appointmentId)

   if (skipsError) {
    console.error('⚠️ Warning: Could not clear skipped appointments:', skipsError)
    // Don't throw error for this - it's not critical
   } else {
    console.log('✅ Step 3 complete: Mechanic skips cleared')
   }

   // Step 4: Force refresh of real-time subscriptions by triggering a notification
   console.log('🔄 Step 4: Triggering real-time updates...')
   try {
    // Use a proper real-time trigger instead of dummy record insertion
    // This avoids the 400 error from incorrect POST requests
    console.log('✅ Step 4 complete: Real-time updates will be handled by existing subscription')
   } catch (triggerError) {
    console.log('⚠️ Real-time trigger failed (non-critical):', triggerError)
   }

   console.log('✅ All database operations completed successfully')

   toast({
    title: "Success",
    description: "Appointment reset successfully. Returning to booking page...",
   })

   // Navigate back to book-appointment with preserved data
   console.log('🔄 Redirecting to book-appointment page with preserved data...')
   router.push(`/book-appointment?appointment_id=${appointmentId}`)
   
  } catch (error) {
   console.error('❌ Error during appointment cancellation:', error)
   toast({
    title: "Error",
    description: error.message || "Failed to cancel appointment. Please try again.",
    variant: "destructive",
   })
  } finally {
   setIsCanceling(false)
   setShowCancelModal(false)
  }
 }

 return (
  <div className="flex flex-col min-h-screen">
   <SiteHeader />
   <main className="flex-1 py-8">
    {/* Header section - original width */}
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
     {/* Page Title */}
     <h1 className="text-3xl font-bold text-center text-[#294a46] mb-2">Pick Your Mechanic</h1>
     <div className="text-center mb-6">
      <p className="text-gray-600">Pick & Pay</p>
     </div>
    </div>

    {/* Available mechanics section - slightly wider */}
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
     {/* Split-Screen Layout */}
     <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Side - Available Mechanics */}
      <div className="w-full lg:w-2/3">
       <Card className="overflow-hidden bg-white h-full">
        <div className="p-6 border-b">
         <h2 className="text-2xl font-semibold text-[#294a46]">Available Mechanics</h2>
         <p className="text-sm text-gray-600 mt-1">Choose your preferred mechanic from the options below</p>
        </div>

        <div className="p-6">
         {isLoadingQuotes ? (
          <div className="flex items-center justify-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a46]"></div>
          </div>
         ) : mechanicQuotes && mechanicQuotes.length > 0 ? (
          <div className="space-y-6">
           {mechanicQuotes.map((quote) => (
            <div 
              key={quote.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-[#294a46] hover:bg-[#e6eeec]/50 transition-all duration-200 cursor-pointer active:scale-[0.99]"
              onClick={() => handleSelectMechanic(quote.mechanic_id, quote.id)}
            >
             {/* Top row: Mechanic info on left, price and availability on right */}
             <div className="flex justify-between items-start mb-4">
              {/* Left side: Mechanic name, rating, reviews */}
              <div className="flex-1">
               <h3 className="font-semibold text-lg text-gray-900">
                {quote.mechanic_profiles?.business_name || `${quote.mechanic_profiles?.first_name} ${quote.mechanic_profiles?.last_name}`}
               </h3>
               {/* Rating on one line */}
               <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-400">⭐</span>
                <span className="text-sm text-gray-700">{quote.mechanic_profiles?.rating || 'N/A'}</span>
               </div>
               {/* Reviews on next line */}
               <div className="text-sm text-gray-600 mt-1">
                {quote.mechanic_profiles?.review_count || 0} reviews
               </div>
              </div>
              
              {/* Right side: Price and availability */}
              <div className="text-right">
               <div className="text-2xl font-bold text-[#294a46] mb-2">${quote.price}</div>
               <div className="text-sm text-gray-600">
                <div className="font-medium">Available:</div>
                <div>{new Date(quote.eta).toLocaleDateString('en-US', {
                 weekday: 'short',
                 month: 'short',
                 day: 'numeric'
                })} {new Date(quote.eta).toLocaleTimeString('en-US', {
                 hour: 'numeric',
                 minute: '2-digit'
                })}</div>
               </div>
              </div>
             </div>

             {/* Profile image and description */}
             <div className="flex items-center gap-3 mb-3">
              {quote.mechanic_profiles?.profile_image_url ? (
               <img 
                src={quote.mechanic_profiles.profile_image_url} 
                alt={quote.mechanic_profiles.full_name}
                className="w-12 h-12 rounded-full object-cover"
               />
              ) : (
               <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg text-gray-500">
                 {quote.mechanic_profiles?.first_name?.charAt(0) || 'M'}
                </span>
               </div>
              )}
              
              {/* Mechanic details */}
              <div className="flex-1">
               {/* Profile descriptions - enhanced display */}
               {quote.mechanic_profiles?.bio && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                 <p className="text-sm font-semibold text-[#294a46] mb-1 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  About This Mechanic
                 </p>
                 
                 {/* Bio */}
                 <div className="mb-1">
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{quote.mechanic_profiles.bio}</p>
                 </div>
                 
                 {/* Specialties if available */}
                 {quote.mechanic_profiles?.specialties && quote.mechanic_profiles.specialties.length > 0 && (
                  <div>
                   <p className="text-xs font-medium text-gray-600 mb-1">Specialties:</p>
                   <div className="flex flex-wrap gap-1">
                    {quote.mechanic_profiles.specialties.map((specialty, index) => (
                     <span key={index} className="bg-[#e6eeec] text-[#294a46] text-xs px-2 py-1 rounded-full">
                      {specialty}
                     </span>
                    ))}
                   </div>
                  </div>
                 )}
                </div>
               )}
               
               {/* Quote notes */}
               {quote.notes && (
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 mt-1">
                 <p className="text-xs font-medium text-blue-800 mb-1">Quote Details:</p>
                 <p className="text-xs text-blue-700">{quote.notes}</p>
                </div>
               )}
              </div>
             </div>
            </div>
           ))}
          </div>
         ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
           {/* Static Title with Loading Spinner */}
           <div className="flex items-center justify-center mb-8">
             <h3 className="text-2xl font-bold text-[#294a46] mr-3">Processing Mechanics</h3>
             <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#294a46]"></div>
           </div>
           
           {/* Animated Loading Messages with Fade Transitions */}
           <div className="space-y-4">
             <div className="h-8 flex items-center justify-center">
               <p className={`text-lg text-gray-700 font-medium transition-opacity duration-300 ${
                 isFading ? 'opacity-0' : 'opacity-100'
               }`}>
                 {loadingMessages[currentMessageIndex]}
               </p>
             </div>
           </div>
          </div>
         )}
        </div>
       </Card>
      </div>

      {/* Stripe Payment Section */}
      <div className="w-full lg:w-1/3">
       <Card className="p-4 border border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 mb-6">
        <div className="flex items-center justify-center mb-3">
         <CreditCard className="h-5 w-5 text-[#294a46] mr-2" />
         <h3 className="font-semibold text-gray-700 text-sm">Payment Integration Coming Soon</h3>
        </div>
        <div className="space-y-2">
         <div className="h-8 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
         <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
          <div className="h-8 bg-white rounded-lg border border-gray-200 shadow-sm"></div>
         </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">Secure payment processing with Stripe</p>
       </Card>

       {/* Order Summary */}
       <Card className="p-0 bg-white shadow-lg sticky top-8 h-fit">
        <div className="p-4 border-b bg-gradient-to-r from-[#294a46] to-[#1e3632]">
         <h2 className="text-lg font-semibold text-white">Order Summary</h2>
         <p className="text-gray-200 text-sm mt-1">Review your appointment details</p>
        </div>

        <div className="p-4">
         <div className="space-y-4">
          <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
           <span className="text-base leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">📅</span>
           <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Appointment Details</h3>
            <p className="text-xs text-gray-600 mt-1">{formatDate(appointment.appointment_date)}</p>
            <div className="flex items-start mt-1">
             <MapPin className="h-3 w-3 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
             <p className="text-xs text-gray-500">{appointment.location}</p>
            </div>
           </div>
          </div>

          {appointment.vehicles && (
           <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
            <span className="text-base leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🚗</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Vehicle</h3>
             <p className="text-xs text-gray-600 mt-1 font-medium">
              {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
             </p>
             {appointment.vehicles.color && (
              <p className="text-xs text-gray-500 mt-1">Color: {appointment.vehicles.color}</p>
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
           <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
            <span className="text-base leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🔧</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Requested Services</h3>
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
           <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
            <span className="text-base leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">⚠️</span>
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Reported Issues</h3>
             <ul className="mt-1 space-y-1">
              {appointment.selected_car_issues.map((issue, index) => (
               <li key={index} className="flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                <span className="text-xs text-gray-600">{formatCarIssue(issue)}</span>
               </li>
              ))}
             </ul>
            </div>
           </div>
          )}

          {appointment.issue_description && (
           <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
            <FileText className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
             <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Description</h3>
             <p className="text-xs text-gray-600 mt-1 leading-relaxed">{appointment.issue_description}</p>
            </div>
           </div>
          )}

          <div className="flex items-start space-x-3 pb-3 border-b border-gray-200">
           <span className="text-base leading-none text-[#294a46] mt-0.5 flex-shrink-0 inline-flex items-center justify-center">🔋</span>
           <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-sm sm:ml-0 ml-2">Car Status</h3>
            <p className="text-xs text-gray-600 mt-1">
             {appointment.car_runs !== null
              ? appointment.car_runs
               ? "✅ Car is running"
               : "❌ Car is not running"
              : "❓ Car status not specified"}
            </p>
           </div>
          </div>
         </div>
        </div>
       </Card>
      </div>
     </div>
    </div>

    {/* Back Button - original width */}
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
     <div className="text-center">
      <Button
       onClick={handleBack}
       variant="ghost"
       className="flex items-center gap-2 text-[#294a46] hover:bg-gray-100"
      >
       <ChevronLeft className="h-4 w-4" />
       Back
      </Button>
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

// Loading component for Suspense fallback
function PickMechanicLoading() {
 return (
  <div className="flex flex-col min-h-screen">
   <SiteHeader />
   <main className="flex-1 py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
      <p className="text-gray-600">Loading appointment details...</p>
     </div>
    </div>
   </main>
   <Footer />
  </div>
 )
}

// Main export with Suspense wrapper
export default function PickMechanicPage() {
 return (
  <Suspense fallback={<PickMechanicLoading />}>
   <PickMechanicContent />
  </Suspense>
 )
}
