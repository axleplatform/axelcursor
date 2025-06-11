"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User, Loader2, Clock, MapPin, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { UpcomingAppointments } from "@/components/upcoming-appointments"
import { useToast } from "@/components/ui/use-toast"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import MechanicSchedule from "@/components/mechanic-schedule"
import {
  getAvailableAppointmentsForMechanic,
  getQuotedAppointmentsForMechanic,
  createOrUpdateQuote,
} from "@/lib/mechanic-quotes"
import { formatDate, validateMechanicId } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { ChangeEvent } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { ProfileDropdown } from "@/components/profile-dropdown"
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  car_runs?: boolean
  selected_services?: string[]
  vehicles?: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  }
  quote?: {
    id: string
    price: number
    created_at: string
  }
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
  isLoading: boolean
  onStart: (id: string) => Promise<boolean>
  onCancel: (id: string) => Promise<boolean>
  onUpdatePrice: (id: string, price: number) => Promise<boolean>
}

export default function MechanicDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<Appointment[]>([])
  const [quotedAppointments, setQuotedAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showETAError, setShowETAError] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Add notification state at the top of the component
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Add showNotification function
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  // Generate available dates (next 7 days)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        })
      });
    }
    return dates;
  };

  // Generate time slots (8 AM to 6 PM, 15-minute increments)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  // Extract fetchInitialAppointments to be accessible throughout the component
  const fetchInitialAppointments = async () => {
    try {
      setIsAppointmentsLoading(true);
      console.log("🔍 Fetching initial appointments for mechanic:", mechanicId);
      
      // Fetch ALL pending appointments with related data
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicles(
            make,
            model,
            year,
            vin,
            mileage,
            color
          ),
          mechanic_quotes(
            id,
            mechanic_id,
            price,
            created_at
          ),
          mechanic_skipped_appointments(
            mechanic_id
          )
        `)
        .eq('status', 'pending');

      if (appointmentError) {
        console.error("❌ Error fetching available appointments:", appointmentError);
        throw new Error("Failed to fetch available appointments");
      }

      // Filter available appointments: not skipped AND (no quote from me OR I quoted but wasn't selected)
      const availableAppointments = appointments?.filter(apt => {
        const skippedByMe = apt.mechanic_skipped_appointments?.some(
          skip => skip.mechanic_id === mechanicId
        );
        const selectedMechanic = apt.selected_mechanic_id;
        
        // Show if: not skipped AND (no selected mechanic OR I wasn't selected)
        return !skippedByMe && (!selectedMechanic || selectedMechanic !== mechanicId);
      }) || [];

      console.log('📋 Available appointments after filtering:', availableAppointments.length);

      // Get upcoming appointments: where THIS mechanic was selected by customer
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('appointments')
        .select('*, vehicles(*)')
        .eq('selected_mechanic_id', mechanicId)
        .in('status', ['confirmed', 'in_progress', 'pending_payment'])
        .order('appointment_date', { ascending: true });

      if (upcomingError) {
        console.error("❌ Error fetching upcoming appointments:", upcomingError);
        throw new Error("Failed to fetch upcoming appointments");
      }

      console.log('Initial appointments loaded:', {
        available: availableAppointments.length,
        upcoming: upcomingData?.length || 0
      });

      setAvailableAppointments(availableAppointments);
      setUpcomingAppointments(upcomingData || []);
    } catch (error) {
      console.error("Error fetching initial appointments:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load appointments";
      showNotification(errorMessage, 'error');
    } finally {
      setIsAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsAuthLoading(true)
        setError(null)

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError)
          throw new Error("Failed to get session")
        }

        if (!session) {
          console.log("❌ No session found, redirecting to login")
          router.replace("/login")
          return
        }

        // Get mechanic profile
        const { data: profile, error: profileError } = await supabase
          .from("mechanic_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()

        if (profileError) {
          console.error("❌ Profile error:", profileError)
          if (profileError.code === "PGRST116") {
            // No profile found
            console.log("❌ No mechanic profile found, redirecting to onboarding")
            router.replace("/onboarding-mechanic-1")
            return
          }
          throw new Error("Failed to get mechanic profile")
        }

        if (!profile) {
          console.log("❌ No mechanic profile found, redirecting to onboarding")
          router.replace("/onboarding-mechanic-1")
          return
        }

        // Validate profile ID
        if (!profile.id || typeof profile.id !== "string") {
          console.error("❌ Invalid profile ID:", profile.id)
          throw new Error("Invalid profile ID")
        }

        console.log("✅ Mechanic profile found:", profile.id)
        setMechanicId(profile.id)
        setMechanicProfile(profile)

      } catch (error: any) {
        console.error("❌ Auth check error:", error)
        setError(error.message || "Authentication failed")
        router.replace("/login?error=auth_failed")
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Add debug logging for state changes
  useEffect(() => {
    console.log("🔍 mechanicId state changed:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })
  }, [mechanicId])

  // Real-time subscription handlers
  useEffect(() => {
    console.log("🔄 Setting up subscriptions with mechanicId:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })
    
    if (!mechanicId) {
      console.log("⏳ Waiting for mechanicId before setting up subscriptions...")
      return
    }

    if (!validateMechanicId(mechanicId)) {
      console.error("❌ Invalid mechanicId, redirecting to login")
      setError("Invalid mechanic ID")
      toast({
        title: "Error",
        description: "Invalid mechanic ID. Please try logging in again.",
        variant: "destructive",
      })
      window.location.href = "/login"
      return
    }

    // Subscribe to appointment changes
    const appointmentsSubscription = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `status=eq.pending`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Appointment change received:', payload)
          await fetchInitialAppointments();
        }
      )
      .subscribe()

    // Subscribe to quote changes
    const quotesSubscription = supabase
      .channel('quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mechanic_quotes',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Quote change received:', payload)
          await fetchInitialAppointments();
        }
      )
      .subscribe()

    // Initial fetch of appointments
    fetchInitialAppointments()

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 Cleaning up subscriptions")
      appointmentsSubscription.unsubscribe()
      quotesSubscription.unsubscribe()
    }
  }, [mechanicId])

  // Add useEffect to load mechanic profile on component mount
  useEffect(() => {
    const loadMechanicProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        console.log('Loading mechanic profile for user:', user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('mechanic_profiles')
          .select('id, user_id, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading mechanic profile:', profileError);
          return;
        }

        if (!profile) {
          console.error('No mechanic profile found for user:', user.id);
          return;
        }

        console.log('Debug - IDs being used:', {
          userId: user.id,
          mechanicProfileId: profile.id,
          whatWeNeedForQuote: profile.id
        });

        console.log('Mechanic profile loaded:', profile);
        setMechanicId(profile.id);
        setMechanicProfile(profile);
      } catch (error) {
        console.error('Error in loadMechanicProfile:', error);
      }
    };

    loadMechanicProfile();
  }, []);

  // Add debug function for mechanic profile
  const debugMechanicProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('=== MECHANIC PROFILE DEBUG ===');
    console.log('1. Current auth user ID:', user?.id);
    
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('mechanic_profiles')
      .select('*')
      .eq('user_id', user?.id);
    
    console.log('2. Profile query result:', { profile, error });
    
    if (!profile || profile.length === 0) {
      console.error('❌ NO MECHANIC PROFILE FOUND FOR USER');
      showNotification('No mechanic profile found. Please complete your profile setup.', 'error');
      // Redirect to profile setup
      router.push('/onboarding-mechanic-1');
      return null;
    }
    
    console.log('3. Mechanic profile ID:', profile[0].id);
    console.log('4. Full profile:', profile[0]);
    
    return profile[0];
  };

  // Add function to create mechanic profile if needed
  const createMechanicProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: newProfile, error } = await supabase
      .from('mechanic_profiles')
      .insert({
        user_id: user?.id,
        first_name: user?.user_metadata?.first_name || 'Unknown',
        last_name: user?.user_metadata?.last_name || 'Mechanic',
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create mechanic profile:', error);
      return null;
    }
    
    console.log('Created new mechanic profile:', newProfile);
    return newProfile;
  };

  // Update handleSubmitQuote with debugging
  const handleSubmitQuote = async (appointmentId: string, price: number, eta: string, notes?: string) => {
    try {
      setIsProcessing(true);
      console.log('=== QUOTE SUBMISSION DEBUG ===');
      console.log('Starting quote submission with:', {
        appointmentId,
        price,
        eta,
        notes
      });

      // Debug and get mechanic profile
      const mechanicProfile = await debugMechanicProfile();
      if (!mechanicProfile) {
        console.log('Attempting to create new mechanic profile...');
        const newProfile = await createMechanicProfile();
        if (!newProfile) {
          throw new Error('Failed to create mechanic profile');
        }
        mechanicProfile = newProfile;
      }
      
      // Log what we're about to submit
      console.log('Quote submission details:', {
        mechanicId: mechanicProfile.id,
        appointmentId,
        price,
        eta
      });

      // Validate ETA selection
      if (!selectedDate || !selectedTime) {
        setShowETAError(true);
        toast({
          title: "Error",
          description: "Please select both date and time for when you can show up.",
          variant: "destructive",
        });
        return;
      }

      // Combine date and time
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const etaDateTime = new Date(year, month - 1, day, hour, minute);
      
      console.log('Creating quote with:', {
        mechanic_id: mechanicProfile.id,
        appointment_id: appointmentId,
        price,
        eta: etaDateTime.toISOString(),
        notes
      });

      // Submit quote with verified mechanic ID and ISO timestamp
      const { success, error } = await createOrUpdateQuote(
        mechanicProfile.id,
        appointmentId,
        price,
        etaDateTime.toISOString(),
        notes
      );

      if (!success) {
        throw new Error(error);
      }

      toast({
        title: "Success",
        description: "Quote submitted successfully!",
      });

      // Reset form
      setPriceInput("");
      setSelectedDate("");
      setSelectedTime("");
      setShowETAError(false);

      // Refresh appointments after successful quote
      await fetchInitialAppointments();
    } catch (error) {
      console.error("Error submitting quote:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle skipping an appointment
  const handleSkipAppointment = async (appointment: Appointment) => {
    if (!appointment.id) {
      console.error('❌ Skip failed: No appointment ID');
      showNotification('Invalid appointment', 'error');
      return;
    }

    if (!mechanicId) {
      console.error('❌ Skip failed: No mechanic ID');
      showNotification('Please log in as a mechanic', 'error');
      return;
    }

    console.log('🔄 Starting skip process:', {
      appointmentId: appointment.id,
      mechanicId,
      timestamp: new Date().toISOString()
    });

    try {
      setIsProcessing(true);

      // Debug auth flow
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Auth error:', userError);
        throw new Error('Authentication error');
      }

      console.log('👤 Current user:', {
        userId: user?.id,
        mechanicId,
        timestamp: new Date().toISOString()
      });

      // Verify the mechanic profile belongs to current user
      const { data: profile, error: profileError } = await supabase
        .from('mechanic_profiles')
        .select('*')
        .eq('id', mechanicId)
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('❌ Profile verification failed:', profileError);
        throw new Error('Failed to verify mechanic profile');
      }

      if (!profile) {
        console.error('❌ Mechanic profile not found or unauthorized:', {
          mechanicId,
          userId: user?.id
        });
        throw new Error('Mechanic profile not found or unauthorized');
      }

      console.log('✅ Mechanic profile verified:', {
        profileId: profile.id,
        userId: profile.user_id,
        timestamp: new Date().toISOString()
      });
      
      // First verify the appointment exists and is pending
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointment.id)
        .single();

      if (appointmentError) {
        console.error('❌ Appointment verification failed:', appointmentError);
        throw new Error(`Failed to verify appointment: ${appointmentError.message}`);
      }

      if (!appointmentData) {
        console.error('❌ Appointment not found:', appointment.id);
        throw new Error('Appointment not found');
      }

      if (appointmentData.status !== 'pending') {
        console.error('❌ Appointment is not pending:', appointmentData.status);
        throw new Error(`Appointment is ${appointmentData.status}`);
      }

      // Check if mechanic has already skipped
      const { data: existingSkip, error: skipCheckError } = await supabase
        .from('mechanic_skipped_appointments')
        .select('id')
        .eq('mechanic_id', mechanicId)
        .eq('appointment_id', appointment.id)
        .single();

      if (skipCheckError && skipCheckError.code !== 'PGRST116') {
        console.error('❌ Skip check failed:', skipCheckError);
        throw new Error(`Failed to check existing skips: ${skipCheckError.message}`);
      }

      if (existingSkip) {
        console.error('❌ Mechanic already skipped:', {
          mechanicId,
          appointmentId: appointment.id
        });
        throw new Error('You have already skipped this appointment');
      }

      // Record the skip with minimal return
      const { error: skipError } = await supabase
        .from('mechanic_skipped_appointments')
        .insert({
          mechanic_id: mechanicId,
          appointment_id: appointment.id,
          skipped_at: new Date().toISOString()
        }, { returning: 'minimal' });

      if (skipError) {
        console.error('❌ Skip recording failed:', {
          error: skipError,
          mechanicId,
          appointmentId: appointment.id
        });
        throw new Error(`Failed to record skip: ${skipError.message}`);
      }

      console.log('✅ Skip recorded successfully');

      // Check if all mechanics have skipped
      const { data: allSkipped, error: checkError } = await supabase
        .rpc('check_all_mechanics_skipped', {
          p_appointment_id: appointment.id
        });

      if (checkError) {
        console.error('❌ Failed to check if all mechanics skipped:', checkError);
        throw new Error(`Failed to check mechanics: ${checkError.message}`);
      }

      if (allSkipped) {
        console.log('🔄 All mechanics skipped, cancelling appointment');
        
        // Cancel the appointment
        const { error: cancelError } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'system',
            cancellation_reason: 'All mechanics skipped'
          })
          .eq('id', appointment.id);

        if (cancelError) {
          console.error('❌ Failed to cancel appointment:', cancelError);
          throw new Error(`Failed to cancel appointment: ${cancelError.message}`);
        }

        console.log('✅ Appointment cancelled successfully');
      }

      // Update local state - immediately remove the skipped appointment
      setAvailableAppointments(prev => 
        prev.filter(a => a.id !== appointment.id)
      );

      // Show success message
      showNotification('Appointment skipped successfully', 'success');

      // Refetch appointments to ensure UI is in sync
      await fetchInitialAppointments();

      // Move to next appointment if available
      const nextAppointment = availableAppointments.find(a => a.id !== appointment.id);
      if (nextAppointment) {
        setCurrentAvailableIndex(availableAppointments.indexOf(nextAppointment));
      }

    } catch (error) {
      console.error('❌ Skip process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigate through available appointments
  const goToNextAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev + 1) % availableAppointments.length)
      setPriceInput("")
    }
  }

  const goToPrevAvailable = () => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev === 0 ? availableAppointments.length - 1 : prev - 1))
      setPriceInput("")
    }
  }

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#294a46] mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="bg-[#294a46] text-white px-4 py-2 rounded-md hover:bg-[#1e3632] transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Main dashboard content
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader />

      {/* Notification Component */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Dashboard Title and Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Mechanic Dashboard</h1>
          {mechanicProfile && <p className="text-lg text-gray-600 mt-1">Welcome back, {mechanicProfile.first_name}!</p>}

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Find appointments"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <button className="bg-[#294a46] text-white px-4 py-2 rounded-full hover:bg-[#1e3632] transition-colors flex items-center gap-2">
              Refer a friend
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 pb-12 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Upcoming Appointments</h2>
            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#294a46]" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2">No Upcoming Appointments</h3>
                <p className="text-gray-600">
                  You don't have any upcoming appointments. New appointments will appear here when they're scheduled.
                </p>
              </div>
            ) : (
          <UpcomingAppointments
            appointments={upcomingAppointments}
            isLoading={isAppointmentsLoading}
                onStart={handleStartAppointment}
                onCancel={handleCancelAppointment}
                onUpdatePrice={handleUpdatePrice}
              />
            )}
          </div>

          {/* Column 2: Schedule */}
          <MechanicSchedule />

          {/* Column 3: Available Appointments */}
          <div className="bg-[#294a46] rounded-lg shadow-sm p-6 text-white">
            <h2 className="text-xl font-semibold mb-6">Available Appointments</h2>

            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : availableAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-white/70" />
                <h3 className="text-xl font-medium mb-2">No Available Appointments</h3>
                <p className="text-white/70">
                  There are no pending appointments at this time. Check back later for new requests.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full transition-colors"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Navigation buttons for multiple appointments */}
                {availableAppointments.length > 1 && (
                  <>
                    <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                    <button
                      onClick={goToPrevAvailable}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Previous appointment"
                      disabled={isProcessing}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    </div>
                    <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                    <button
                      onClick={goToNextAvailable}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                      aria-label="Next appointment"
                      disabled={isProcessing}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    </div>
                  </>
                )}

                {/* Current appointment details */}
                {availableAppointments[currentAvailableIndex] && (
                  <div className="bg-white/10 rounded-lg p-6">
                    {/* Vehicle Information */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">
                        {availableAppointments[currentAvailableIndex].vehicles?.year}{" "}
                        {availableAppointments[currentAvailableIndex].vehicles?.make}{" "}
                        {availableAppointments[currentAvailableIndex].vehicles?.model}
                      </h3>
                      {availableAppointments[currentAvailableIndex].vehicles?.vin && (
                        <p className="text-sm text-white/70">
                          VIN: {availableAppointments[currentAvailableIndex].vehicles.vin}
                        </p>
                      )}
                      {availableAppointments[currentAvailableIndex].vehicles?.mileage && (
                        <p className="text-sm text-white/70">
                          Mileage: {availableAppointments[currentAvailableIndex].vehicles.mileage} miles
                        </p>
                      )}
                    </div>

                    {/* Quote Status */}
                    {availableAppointments[currentAvailableIndex].mechanic_quotes?.some(
                      q => q.mechanic_id === mechanicId
                    ) && (
                      <div className="mb-4">
                        <span className="text-sm text-yellow-300 bg-yellow-900/30 px-3 py-1.5 rounded-full inline-flex items-center">
                          <Clock className="h-4 w-4 mr-1.5" />
                          Awaiting customer selection (You quoted: $
                          {availableAppointments[currentAvailableIndex].mechanic_quotes.find(
                            q => q.mechanic_id === mechanicId
                          )?.price})
                        </span>
                      </div>
                    )}

                    {/* Location and Date */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{availableAppointments[currentAvailableIndex].location}</span>
                        </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{formatDate(availableAppointments[currentAvailableIndex].appointment_date)}</span>
                        </div>
                      </div>

                    {/* Issue Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Issue Description</h4>
                      <p className="text-sm text-white/70 bg-white/5 p-3 rounded-md">
                        {availableAppointments[currentAvailableIndex].issue_description || "No description provided"}
                      </p>
                    </div>

                    {/* Selected Services */}
                    {availableAppointments[currentAvailableIndex].selected_services && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Selected Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                            <span
                              key={index}
                              className="bg-white/20 text-xs px-3 py-1 rounded-full"
                            >
                              {service}
                            </span>
                          ))}
                    </div>
                      </div>
                    )}

                    {/* Car Status */}
                    {availableAppointments[currentAvailableIndex].car_runs !== null && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Car Status</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${availableAppointments[currentAvailableIndex].car_runs ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm">
                            {availableAppointments[currentAvailableIndex].car_runs
                              ? "Car is running"
                              : "Car is not running"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quote Input */}
                    <div className="mb-6">
                      <label htmlFor="price" className="block text-sm font-medium mb-2">
                        Your Quote (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70">$</span>
                        <input
                          type="number"
                          id="price"
                          value={priceInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setPriceInput(e.target.value)}
                          placeholder="Enter your price"
                          className="w-full bg-white/10 border border-white/20 rounded-md pl-8 pr-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          disabled={isProcessing}
                          min="10"
                          max="10000"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* ETA Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        When can you show up? <span className="text-red-500">*</span>
                      </label>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Date Selection */}
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Select Date</label>
                          <select
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              setShowETAError(false);
                            }}
                            className={`w-full bg-white/20 border border-white/30 rounded-md px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/50 ${
                              showETAError && !selectedDate ? 'border-red-500 animate-pulse' : ''
                            }`}
                            disabled={isProcessing}
                          >
                            <option value="" className="bg-[#294a46]">Choose a date</option>
                            {getAvailableDates().map((date) => (
                              <option key={date.value} value={date.value} className="bg-[#294a46]">
                                {date.label}
                              </option>
                            ))}
                          </select>
                      </div>

                        {/* Time Selection */}
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Select Time</label>
                          <select
                            value={selectedTime}
                            onChange={(e) => {
                              setSelectedTime(e.target.value);
                              setShowETAError(false);
                            }}
                            className={`w-full bg-white/20 border border-white/30 rounded-md px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/50 ${
                              showETAError && !selectedTime ? 'border-red-500 animate-pulse' : ''
                            }`}
                            disabled={isProcessing || !selectedDate}
                          >
                            <option value="" className="bg-[#294a46]">Choose a time</option>
                            {getTimeSlots().map((slot) => (
                              <option key={slot.value} value={slot.value} className="bg-[#294a46]">
                                {slot.label}
                              </option>
                            ))}
                          </select>
                          </div>
                          </div>
                      
                      {/* Error message */}
                      {showETAError && (!selectedDate || !selectedTime) && (
                        <p className="text-red-500 text-sm mt-2 animate-pulse">
                          Please select both date and time
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmitQuote(availableAppointments[currentAvailableIndex].id, Number.parseFloat(priceInput), selectedDate + 'T' + selectedTime)}
                        disabled={isProcessing || !priceInput || Number.parseFloat(priceInput) <= 0}
                        className="flex-1 bg-white text-[#294a46] font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-gray-100 hover:shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center">
                            <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-[#294a46] rounded-full mr-2"></span>
                            Processing...
                          </span>
                        ) : (
                          "Submit Quote"
                        )}
                      </button>
                      <button
                        onClick={() => handleSkipAppointment(availableAppointments[currentAvailableIndex])}
                        disabled={isProcessing}
                        className="border border-white text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        Skip
                      </button>
                    </div>

                    {/* Pagination Dots */}
                    {availableAppointments.length > 1 && (
                      <div className="flex justify-center mt-4 gap-1">
                        {availableAppointments.map((_: Appointment, index: number) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${index === currentAvailableIndex ? "bg-white" : "bg-white/30"}`}
                          ></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quoted Appointments Section */}
        {quotedAppointments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Your Quoted Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotedAppointments.map((appointment: Appointment) => (
                <Card key={appointment.id} className="p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{formatDate(appointment.appointment_date)}</h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{appointment.location}</span>
                      </div>
                    </div>
                    <div className="bg-[#294a46] text-white px-3 py-1 rounded-md">
                      <p className="text-lg font-bold">${appointment.quote?.price}</p>
                    </div>
                  </div>

                  {appointment.vehicles && (
                    <div className="mb-3 text-sm">
                      <div className="font-medium">
                        {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                      </div>
                      {appointment.vehicles.mileage && (
                        <div className="text-gray-600">Mileage: {appointment.vehicles.mileage}</div>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Quote submitted: {new Date(appointment.quote?.created_at || "").toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 text-xs bg-yellow-50 p-2 rounded border border-yellow-100">
                      Waiting for customer selection
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for No Appointments */}
        {!isAppointmentsLoading && 
         availableAppointments.length === 0 && 
         upcomingAppointments.length === 0 && 
         quotedAppointments.length === 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-8 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to Your Dashboard</h2>
            <p className="text-gray-600 mb-6">
              You don't have any appointments yet. When customers request service in your area, 
              you'll see them appear here.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-[#294a46] text-white px-6 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
              >
                Refresh
              </button>
              <button 
                onClick={() => router.push('/mechanic/profile')}
                className="border border-[#294a46] text-[#294a46] px-6 py-2 rounded-full hover:bg-[#294a46] hover:text-white transition-colors"
              >
                Update Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
