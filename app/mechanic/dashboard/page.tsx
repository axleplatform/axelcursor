"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User, Loader2, Clock, MapPin, Check, X, ChevronLeft, ChevronRight, CalendarDays, Calendar } from "lucide-react"
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
  selected_mechanic_id?: string
  mechanic_quotes?: Array<{
    id: string
    mechanic_id: string
    price: number
    eta: string
  }>
  mechanic_skips?: Array<{
    mechanic_id: string
  }>
  selected_car_issues?: string[]
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
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info' | 'skip', message: string} | null>(null);

  // Add new state for quote editing
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [updatePrice, setUpdatePrice] = useState<string>("");
  const [updateDate, setUpdateDate] = useState<string>("");
  const [updateTime, setUpdateTime] = useState<string>("");

  // Add new state variables after the existing ones
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Add new state variables after the existing ones
  const [startingAppointment, setStartingAppointment] = useState<Appointment | null>(null);
  const [etaMinutes, setEtaMinutes] = useState('30');
  const [isStarting, setIsStarting] = useState(false);

  // Add new state variables after the existing ones
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Add showNotification function
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'skip' = 'error') => {
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

  // Update fetchInitialAppointments function
  const fetchInitialAppointments = async () => {
    if (!mechanicId) return;
    
    try {
      setIsAppointmentsLoading(true);
      console.log('🔍 Fetching appointments for mechanic:', mechanicId);
      
      // Get all appointments with quotes and skips
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicles!appointment_id(*),
          mechanic_quotes!appointment_id(*),
          mechanic_skipped_appointments!appointment_id(*)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Available appointments: pending status, no quote from this mechanic yet, not cancelled or skipped
      const availableAppointments = appointments?.filter(apt => {
        const alreadyQuoted = apt.mechanic_quotes?.some(
          (quote: any) => quote.mechanic_id === mechanicId
        );
        const alreadySkipped = apt.mechanic_skipped_appointments?.some(
          (skip: any) => skip.mechanic_id === mechanicId
        );
        return apt.status === 'pending' && !alreadyQuoted && !alreadySkipped && apt.status !== 'cancelled';
      }) || [];
      
      // Upcoming appointments: has quote from this mechanic OR mechanic is selected, not cancelled or skipped
      const upcomingAppointments = appointments?.filter(apt => {
        const quotedByMe = apt.mechanic_quotes?.some(
          (quote: any) => quote.mechanic_id === mechanicId
        );
        const selectedAsMe = apt.selected_mechanic_id === mechanicId;
        const alreadySkipped = apt.mechanic_skipped_appointments?.some(
          (skip: any) => skip.mechanic_id === mechanicId
        );
        
        return (quotedByMe || selectedAsMe) && !alreadySkipped && apt.status !== 'cancelled';
      }) || [];
      
      setAvailableAppointments(availableAppointments);
      setUpcomingAppointments(upcomingAppointments);
      
      console.log('Appointments loaded:', {
        available: availableAppointments.length,
        upcoming: upcomingAppointments.length,
        total: appointments?.length
      });
      
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      showNotification('Failed to load appointments', 'error');
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
      showNotification('Appointment skipped successfully', 'skip');

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

  // Update handleUpdateQuote function
  const handleUpdateQuote = async (appointmentId: string) => {
    try {
      const myQuote = upcomingAppointments
        .find(apt => apt.id === appointmentId)
        ?.mechanic_quotes?.find(q => q.mechanic_id === mechanicId);
      
      if (!myQuote) {
        showNotification('Quote not found', 'error');
        return;
      }
      
      // Combine date and time
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const etaDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
      
      const { error } = await supabase
        .from('mechanic_quotes')
        .update({
          price: parseFloat(price),
          eta: etaDateTime,
          notes: notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', myQuote.id);
      
      if (error) {
        throw error;
      }

      showNotification('Quote updated successfully', 'info');
      await fetchInitialAppointments();
      setSelectedAppointment(null);
      // Reset form
      setPrice('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
    } catch (error) {
      console.error('Error updating quote:', error);
      showNotification('Failed to update quote', 'error');
    }
  };

  // Add handleCancelQuote function after handleUpdateQuote
  const handleCancelQuote = async (appointmentId: string) => {
    console.log('=== QUOTE CANCELLATION DEBUG ===');
    console.log('1. Starting cancellation with:', {
      appointmentId,
      mechanicId,
      timestamp: new Date().toISOString()
    });

    try {
      // Get the appointment and quote details
      const appointment = upcomingAppointments.find(apt => apt.id === appointmentId);
      const myQuote = appointment?.mechanic_quotes?.find(q => q.mechanic_id === mechanicId);
      
      console.log('2. Found appointment and quote:', {
        appointment,
        myQuote,
        quoteId: myQuote?.id
      });
      
      if (!appointment || !myQuote) {
        console.error('3. Quote not found:', { appointment, myQuote });
        showNotification('Quote not found', 'error');
        return;
      }

      // Check if appointment is already cancelled
      if (appointment.status === 'cancelled') {
        console.warn('4. Appointment is already cancelled:', appointment.id);
        showNotification('This appointment has already been cancelled', 'error');
        return;
      }

      // Check if payment has been made
      if (appointment.payment_status === 'paid') {
        console.log('5. Payment already made, cannot cancel');
        showNotification('Cannot cancel quote after payment has been made', 'error');
        return;
      }

      // Show confirmation dialog
      if (!window.confirm('Are you sure you want to cancel this quote? This action cannot be undone.')) {
        console.log('6. User cancelled the operation');
        return;
      }

      // Verify quote exists before delete
      console.log('7. Checking if quote exists before delete...');
      const { data: checkBefore, error: checkError } = await supabase
        .from('mechanic_quotes')
        .select('*')
        .eq('id', myQuote.id);

      console.log('8. Pre-delete check:', {
        quoteExists: checkBefore?.length > 0,
        checkBefore,
        checkError,
        quoteStructure: checkBefore?.[0] ? Object.keys(checkBefore[0]) : []
      });

      if (checkError) {
        console.error('9. Error checking quote:', checkError);
        throw checkError;
      }

      if (!checkBefore || checkBefore.length === 0) {
        console.error('10. Quote not found in database:', myQuote.id);
        showNotification('Quote not found in database', 'error');
        return;
      }

      // First, update the appointment to remove the quote reference and mark as cancelled
      console.log('11. Updating appointment to remove quote reference and mark as cancelled...');
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          selected_quote_id: null,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'mechanic'
        })
        .eq('id', appointmentId)
        .eq('selected_quote_id', myQuote.id);

      if (updateError) {
        console.error('12. Error updating appointment:', updateError);
        throw new Error(`Failed to update appointment: ${updateError.message}`);
      }

      console.log('13. Appointment updated successfully');

      // Now delete the quote
      console.log('14. Attempting to delete quote...');
      const { data: deletedData, error: deleteError } = await supabase
        .from('mechanic_quotes')
        .delete()
        .eq('id', myQuote.id)
        .select();

      console.log('15. Delete response:', {
        deletedData,
        deleteError,
        deletedCount: deletedData?.length,
        conditionsUsed: {
          id: myQuote.id
        }
      });

      if (deleteError) {
        console.error('16. Delete error:', deleteError);
        throw deleteError;
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('17. No records deleted!');
        showNotification('Failed to delete quote - no matching record found', 'error');
        return;
      }

      // Verify quote is gone after delete
      console.log('18. Verifying quote is deleted...');
      const { data: checkAfter, error: afterError } = await supabase
        .from('mechanic_quotes')
        .select('*')
        .eq('id', myQuote.id);

      console.log('19. Post-delete verification:', {
        stillExists: checkAfter?.length > 0,
        checkAfter,
        afterError
      });

      if (checkAfter && checkAfter.length > 0) {
        console.error('20. Quote still exists after delete!');
        showNotification('Failed to delete quote - please try again', 'error');
        return;
      }

      console.log('21. Delete successful, updating UI...');
      // Update UI state
      setUpcomingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));

      // Reset form state
      setSelectedAppointment(null);
      setPrice('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');

      showNotification('Quote cancelled successfully', 'success');

    } catch (error) {
      console.error('22. Error in handleCancelQuote:', error);
      showNotification('Failed to cancel quote', 'error');
    }
  };

  // Add new handler functions before the return statement
  const handleStartAppointment = (appointment: Appointment) => {
    setStartingAppointment(appointment);
  };

  const confirmStartAppointment = async () => {
    if (!startingAppointment) return;
    
    setIsStarting(true);
    try {
      // Update appointment status to 'in_progress'
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'in_progress',
          mechanic_eta: etaMinutes,
          started_at: new Date().toISOString()
        })
        .eq('id', startingAppointment.id);
        
      if (error) throw error;
      
      // TODO: Send notification to customer about ETA
      
      showNotification(`Job started! Customer has been notified of your ${etaMinutes} minute ETA.`, 'success');
      
      // Refresh appointments
      await fetchInitialAppointments();
      
      setStartingAppointment(null);
      setEtaMinutes('30');
    } catch (error) {
      console.error('Error starting appointment:', error);
      showNotification('Failed to start appointment', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelConfirmedAppointment = async (appointment: Appointment, quotePrice: number) => {
    const cancellationFee = (quotePrice * 0.05).toFixed(2);
    
    console.log('=== CANCELLATION DEBUG ===');
    console.log('1. Starting cancellation process:', {
      appointmentId: appointment.id,
      mechanicId,
      quotePrice,
      cancellationFee,
      timestamp: new Date().toISOString()
    });
    
    const confirmed = window.confirm(
      `Canceling a confirmed appointment will incur a 5% cancellation fee of $${cancellationFee}.\n` +
      `You will be charged the full price if there is a no-show.\n\n` +
      `Are you sure you want to cancel?`
    );
    
    if (!confirmed) {
      console.log('2. User cancelled the operation');
      return;
    }

    try {
      console.log('3. User confirmed cancellation, proceeding with database operations');

      // Verify appointment exists and is in correct state
      const { data: appointmentCheck, error: checkError } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointment.id)
        .single();

      if (checkError) {
        console.error('4. Error checking appointment:', checkError);
        throw new Error(`Failed to verify appointment: ${checkError.message}`);
      }

      if (!appointmentCheck) {
        console.error('5. Appointment not found:', appointment.id);
        throw new Error('Appointment not found');
      }

      console.log('6. Appointment verification successful:', appointmentCheck);

      // Verify appointment is in a cancellable state
      if (appointmentCheck.status !== 'confirmed' && appointmentCheck.status !== 'in_progress') {
        console.error('7. Invalid appointment status for cancellation:', appointmentCheck.status);
        throw new Error(`Cannot cancel appointment in ${appointmentCheck.status} status`);
      }

      // Try to log the cancellation
      try {
        console.log('8. Attempting to log cancellation with fee...');
        const { error: logError } = await supabase
          .from('appointment_cancellations')
          .insert({
            appointment_id: appointment.id,
            mechanic_id: mechanicId,
            cancellation_fee: cancellationFee,
            reason: 'mechanic_cancelled_confirmed',
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.warn('9. Warning: Could not log cancellation:', logError);
          // Don't throw error, just log the warning
        } else {
          console.log('10. Cancellation logged successfully');
        }
      } catch (logError) {
        console.warn('11. Warning: Failed to log cancellation:', logError);
        // Continue with the cancellation process even if logging fails
      }

      // Update appointment status with cancellation fee
      console.log('12. Starting appointment update process...');
      
      // Define base update data
      const baseUpdateData = {
        status: 'cancelled',
        cancelled_by: 'mechanic',
        cancellation_fee: cancellationFee
      };

      // Try to update with cancelled_at
      try {
        console.log('13. Attempting update with cancelled_at...');
        const { data: updateWithTimestamp, error: updateError } = await supabase
          .from('appointments')
          .update({ 
            ...baseUpdateData,
            cancelled_at: new Date().toISOString()
          })
          .eq('id', appointment.id)
          .select();

        if (updateError) {
          console.warn('14. Warning: Could not update with cancelled_at:', updateError);
          // Try again without cancelled_at
          console.log('15. Retrying update without cancelled_at...');
          const { data: updateWithoutTimestamp, error: retryError } = await supabase
            .from('appointments')
            .update(baseUpdateData)
            .eq('id', appointment.id)
            .select();

          if (retryError) {
            console.error('16. Error updating appointment status:', retryError);
            throw new Error(`Failed to update appointment: ${retryError.message}`);
          }

          console.log('17. Appointment status updated successfully (without cancelled_at):', updateWithoutTimestamp);
        } else {
          console.log('18. Appointment status updated successfully (with cancelled_at):', updateWithTimestamp);
        }
      } catch (error) {
        console.error('19. Error in update process:', error);
        throw error;
      }

      // Remove from UI
      setUpcomingAppointments(prev => prev.filter(apt => apt.id !== appointment.id));
      
      showNotification(`Appointment cancelled. A $${cancellationFee} cancellation fee will be deducted from your account.`, 'info');
      
    } catch (error) {
      console.error('20. Error in cancellation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Failed to cancel appointment: ${errorMessage}`, 'error');
    }
  };

  // Add handleEditAppointment function
  const handleEditAppointment = (appointment: Appointment) => {
    const myQuote = appointment.mechanic_quotes?.find(q => q.mechanic_id === mechanicId);
    
    if (!myQuote) {
      showNotification('No quote found for this appointment', 'error');
      return;
    }

    if (appointment.selected_mechanic_id === mechanicId) {
      showNotification('Cannot edit quote after being selected by customer', 'error');
      return;
    }

    if (appointment.payment_status === 'paid') {
      showNotification('Cannot edit quote after payment has been made', 'error');
      return;
    }

    // Set the edit state
    setEditAppointment(appointment);
    setEditPrice(myQuote.price.toString());
    const quoteDate = new Date(myQuote.eta);
    setEditDate(quoteDate.toISOString().split('T')[0]);
    setEditTime(quoteDate.toTimeString().slice(0,5));
    setEditNotes(myQuote.notes || '');
    setShowEditModal(true);
  };

  // Add handleSubmitEdit function
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editAppointment || !mechanicId) {
      showNotification('Invalid appointment or mechanic ID', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      
      const myQuote = editAppointment.mechanic_quotes?.find(q => q.mechanic_id === mechanicId);
      if (!myQuote) {
        showNotification('Quote not found', 'error');
        return;
      }

      // Combine date and time
      const [year, month, day] = editDate.split('-');
      const [hour, minute] = editTime.split(':');
      const etaDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();

      // Update the quote
      const { error } = await supabase
        .from('mechanic_quotes')
        .update({
          price: parseFloat(editPrice),
          eta: etaDateTime,
          notes: editNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', myQuote.id);

      if (error) {
        throw error;
      }

      showNotification('Quote updated successfully', 'success');
      setShowEditModal(false);
      await fetchInitialAppointments();
    } catch (error) {
      console.error('Error updating quote:', error);
      showNotification('Failed to update quote', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

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
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notification.type === 'skip' ? 'bg-gray-50 text-gray-700 border border-gray-200' :
          'bg-gray-50 text-gray-800 border border-gray-200'
        }`}>
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Upcoming Appointments
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Your quoted & confirmed jobs
              </p>
            </div>
            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#294a46]" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2 text-gray-900">No Upcoming Appointments</h3>
                <p className="text-gray-600">
                  You haven't quoted any appointments yet. New appointments will appear here when you submit a quote.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const myQuote = appointment.mechanic_quotes?.find(q => q.mechanic_id === mechanicId);
                  const isSelected = appointment.selected_mechanic_id === mechanicId;
                  const isEditing = selectedAppointment?.id === appointment.id;
                  const isConfirmed = appointment.payment_status === 'paid' || appointment.status === 'confirmed';
                  
                  return (
                    <div key={`${appointment.id}-${Date.now()}`} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      {/* Card Header with Price and Status */}
                      <div className="flex justify-between items-start mb-6">
                        {/* Price Quote */}
                        {myQuote && (
                          <div className="text-4xl font-bold text-[#294a46]">
                            ${myQuote.price.toFixed(2)}
                          </div>
                        )}
                        
                        {/* Status and ETA */}
                        <div className="text-right">
                          {isConfirmed ? (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2" style={{ backgroundColor: '#294A46', color: 'white' }}>
                                ✓ Confirmed
                              </span>
                              <div className="text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ) : isSelected ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                              ✓ Customer selected you
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                              ⏳ Awaiting customer selection
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {appointment.vehicles?.year && (
                            <span className="font-medium">{appointment.vehicles.year}</span>
                          )}
                          {appointment.vehicles?.make && (
                            <span className="font-medium">{appointment.vehicles.make}</span>
                          )}
                          {appointment.vehicles?.model && (
                            <span className="font-medium">{appointment.vehicles.model}</span>
                          )}
                          {appointment.vehicles?.vin && (
                            <span className="ml-2">VIN: {appointment.vehicles.vin}</span>
                          )}
                          {appointment.vehicles?.mileage && (
                            <span className="ml-2">{appointment.vehicles.mileage.toLocaleString()} miles</span>
                          )}
                        </div>
                      </div>

                      {/* Location and Date */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{appointment.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{formatDate(appointment.appointment_date)}</span>
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2 text-gray-900">Issue Description</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          {appointment.issue_description || "No description provided"}
                        </p>
                      </div>

                      {/* Selected Services */}
                      {appointment.selected_services && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium mb-2 text-gray-900">Selected Services</h4>
                          <div className="flex flex-wrap gap-2">
                            {appointment.selected_services.map((service: string, index: number) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Car Status */}
                      {appointment.car_runs !== null && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium mb-2 text-gray-900">Car Status</h4>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${appointment.car_runs ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-sm text-gray-600">
                              {appointment.car_runs ? "Car is running" : "Car is not running"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-3">
                        {isConfirmed ? (
                          <>
                            <button
                              onClick={() => handleStartAppointment(appointment)}
                              className="flex-1 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
                              style={{ backgroundColor: '#294A46' }}
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleCancelConfirmedAppointment(appointment, myQuote?.price || 0)}
                              className="flex-1 bg-red-600 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 hover:shadow-md active:scale-[0.99]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleUpdateQuote(appointment.id)}
                                  className="flex-1 bg-[#294a46] text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99]"
                                >
                                  Update Quote
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(null);
                                    setPrice('');
                                    setSelectedDate('');
                                    setSelectedTime('');
                                    setNotes('');
                                  }}
                                  className="flex-1 bg-gray-200 text-gray-700 font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-gray-300 hover:shadow-md active:scale-[0.99]"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <div className="flex gap-3 w-full">
                                <button
                                  onClick={() => handleEditAppointment(appointment)}
                                  className="flex-1 bg-[#294a46] text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99]"
                                >
                                  Edit
                                </button>
                                {appointment.payment_status !== 'paid' && (
                                  <button
                                    onClick={() => handleCancelQuote(appointment.id)}
                                    className="flex-1 bg-red-600 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 hover:shadow-md active:scale-[0.99]"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Schedule */}
          <MechanicSchedule />

          {/* Column 3: Available Appointments */}
          <div className="bg-[#294a46] rounded-lg shadow-sm p-6 text-white">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                Available Appointments
              </h2>
              <p className="text-sm text-white/70 mt-1">
                New appointments to quote
              </p>
            </div>
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
                    {/* Location and Date */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{availableAppointments[currentAvailableIndex].location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{formatDate(availableAppointments[currentAvailableIndex].appointment_date)}</span>
                      </div>
                    </div>

                    {/* Vehicle Information - Two Row Layout */}
                    <div className="mb-6">
                      {/* Row 1: Year, Make, Model */}
                      <div className="flex items-center gap-2 text-white/90 mb-2">
                        {availableAppointments[currentAvailableIndex].vehicles?.year && (
                          <span className="font-medium">{availableAppointments[currentAvailableIndex].vehicles.year}</span>
                        )}
                        {availableAppointments[currentAvailableIndex].vehicles?.make && (
                          <span className="font-medium">{availableAppointments[currentAvailableIndex].vehicles.make}</span>
                        )}
                        {availableAppointments[currentAvailableIndex].vehicles?.model && (
                          <span className="font-medium">{availableAppointments[currentAvailableIndex].vehicles.model}</span>
                        )}
                      </div>
                      {/* Row 2: VIN and Mileage */}
                      <div className="flex items-center gap-4 text-white/70 text-sm">
                        {availableAppointments[currentAvailableIndex].vehicles?.vin && (
                          <span>VIN: {availableAppointments[currentAvailableIndex].vehicles.vin}</span>
                        )}
                        {availableAppointments[currentAvailableIndex].vehicles?.mileage && (
                          <span>{availableAppointments[currentAvailableIndex].vehicles.mileage.toLocaleString()} miles</span>
                        )}
                      </div>
                    </div>

                    {/* Services and Car Status Row */}
                    <div className="flex justify-between items-start mb-6">
                      {/* Selected Services */}
                      {availableAppointments[currentAvailableIndex].selected_services && (
                        <div className="flex-1">
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

                      {/* Car Status - Centered */}
                      {availableAppointments[currentAvailableIndex].car_runs !== null && (
                        <div className="flex-1 text-center">
                          <h4 className="text-sm font-medium mb-2">Car Status</h4>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${availableAppointments[currentAvailableIndex].car_runs ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-sm">
                              {availableAppointments[currentAvailableIndex].car_runs
                                ? "Car is running"
                                : "Car is not running"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Car Issues */}
                    {availableAppointments[currentAvailableIndex].selected_car_issues && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Car Issues</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableAppointments[currentAvailableIndex].selected_car_issues.map((issue: string, index: number) => (
                            <span
                              key={index}
                              className="bg-white/20 text-xs px-3 py-1 rounded-full flex items-center gap-1"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Issue Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Issue Description</h4>
                      <p className="text-sm text-white/70 bg-white/5 p-3 rounded-md">
                        {availableAppointments[currentAvailableIndex].issue_description || "No description provided"}
                      </p>
                    </div>

                    {/* Quote Input - Centered */}
                    <div className="mb-6">
                      <label htmlFor="price" className="block text-sm font-medium mb-2 text-center">
                        Your Quote (USD)
                      </label>
                      <div className="relative max-w-[300px] mx-auto">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70">$</span>
                        <input
                          type="number"
                          id="price"
                          value={priceInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setPriceInput(e.target.value)}
                          placeholder="Enter your price"
                          className="w-full bg-white/10 border border-white/20 rounded-md pl-8 pr-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-2xl font-bold"
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

      {/* ETA Modal */}
      {startingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Start Appointment</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated arrival time to customer location:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                />
                <span className="text-gray-600">minutes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Customer will be notified of your ETA
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmStartAppointment}
                disabled={isStarting}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isStarting ? 'Starting...' : 'Start Job'}
              </button>
              <button
                onClick={() => {
                  setStartingAppointment(null);
                  setEtaMinutes('30');
                }}
                disabled={isStarting}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Quote</h3>
            
            <form onSubmit={handleSubmitEdit}>
              {/* Price Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                    min="10"
                    max="10000"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* ETA Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When can you show up?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Select Date</label>
                    <select
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                      required
                    >
                      <option value="">Choose a date</option>
                      {getAvailableDates().map((date) => (
                        <option key={date.value} value={date.value}>
                          {date.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Select Time</label>
                    <select
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                      required
                    >
                      <option value="">Choose a time</option>
                      {getTimeSlots().map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-[#294a46] text-white font-medium py-2 px-4 rounded-md hover:bg-[#1e3632] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Updating...' : 'Update Quote'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
