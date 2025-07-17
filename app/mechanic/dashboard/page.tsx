"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import type { ChangeEvent } from 'react'
import { useRouter } from "next/navigation"
import { Search, Loader2, Clock, MapPin, X, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useToast } from "@/components/ui/use-toast"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import MechanicSchedule from "@/components/mechanic-schedule"
import {
  getAvailableAppointmentsForMechanic,
  getQuotedAppointmentsForMechanic,
  createOrUpdateQuote,
  selectQuoteForAppointment,
} from "@/lib/mechanic-quotes"
import { formatDate, validateMechanicId, formatCarIssue, formatRelativeTime } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useIsMobile } from "@/hooks/use-mobile"
import { GoogleMapsLink } from "@/components/google-maps-link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { 
  Appointment, 
  MechanicProfile, 
  MechanicQuote,
  NotificationState,
  DateOption,
  TimeSlot,
  AppointmentWithRelations,
  MechanicSkip
} from "@/types/index"

// Define the type for mechanic quotes with appointment data
type MechanicQuoteWithAppointment = {
  id: string
  price: number
  eta: string
  notes: string | null
  created_at: string
  status: string
  appointments: AppointmentWithRelations
}

// Define the type for edited appointments query results
interface EditedAppointmentResult {
  id: string
  edited_after_quotes: boolean
  mechanic_quotes: MechanicQuote[]
  // Add other appointment fields as needed
}

export default function MechanicDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicProfile, setMechanicProfile] = useState<MechanicProfile | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isMechanicLoading, setIsMechanicLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Appointment states
  const [availableAppointments, setAvailableAppointments] = useState<AppointmentWithRelations[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithRelations[]>([])
  const [skippedAppointments, setSkippedAppointments] = useState<MechanicSkip[]>([])
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState<boolean>(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)
  const [currentUpcomingIndex, setCurrentUpcomingIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  
  // Appointment visibility logic state
  const [restoredToday, setRestoredToday] = useState<Set<string>>(new Set())
  // Helper functions for appointment visibility logic
  const isPastETA = (appointment: AppointmentWithRelations): boolean => {
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
    if (!myQuote?.eta) return false;
    
    const etaDate = new Date(myQuote.eta);
    const currentDate = new Date();
    
    // Set both dates to midnight for day boundary comparison
    const etaMidnight = new Date(etaDate.getFullYear(), etaDate.getMonth(), etaDate.getDate());
    const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    return currentMidnight > etaMidnight;
  };

  const isRestoredToday = (appointmentId: string): boolean => {
    return restoredToday.has(appointmentId);
  };

  const shouldShowInUpcoming = (appointment: AppointmentWithRelations): boolean => {
    // If it's restored today, always show it
    if (isRestoredToday(appointment.id)) {
      return true;
    }
    
    // If it's past ETA, don't show it in upcoming
    if (isPastETA(appointment)) {
      return false;
    }
    
    // For cancelled appointments, only show if they've been restored today
    if (appointment.status === 'cancelled') {
      return isRestoredToday(appointment.id);
    }
    
    // Don't show edited appointments in upcoming - they should be in available
    if (appointment.edited_after_quotes) {
      return false;
    }
    
    // Otherwise, show it normally
    return true;
  };

  const handleRestoreAppointment = (appointment: AppointmentWithRelations) => {
    setRestoredToday(prev => new Set([...prev, appointment.id]));
  };

  const handleToggleCancelledAppointment = (appointment: AppointmentWithRelations) => {
    if (appointment.status === 'cancelled') {
      if (isRestoredToday(appointment.id)) {
        // Remove from restored list (hide it)
        setRestoredToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(appointment.id);
          return newSet;
        });
        toast({
          title: "Appointment Hidden",
          description: "Cancelled appointment has been hidden from upcoming appointments.",
        });
      } else {
        // Add to restored list (show it)
        handleRestoreAppointment(appointment);
        toast({
          title: "Appointment Restored",
          description: "Cancelled appointment has been restored to upcoming appointments.",
        });
      }
    }
  };

  // Schedule-specific handlers
  const handleScheduleCancel = (appointment: AppointmentWithRelations) => {
    // First navigate to the appointment to show it to the user
    navigateToAppointmentFromSchedule(appointment);
    
    // Then open the cancel modal
    setShowScheduleCancelModal(true);
  };

  const handleScheduleEdit = (appointment: AppointmentWithRelations) => {
    // First navigate to the appointment to show it to the user
    navigateToAppointmentFromSchedule(appointment);
    
    // Initialize form fields with current appointment data
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
    if (myQuote) {
      setPriceInput(myQuote.price.toString());
      
      // Parse ETA date and time
      const etaDate = new Date(myQuote.eta);
      const year = etaDate.getFullYear();
      const month = pad(etaDate.getMonth() + 1);
      const day = pad(etaDate.getDate());
      const hours = pad(etaDate.getHours());
      const minutes = pad(etaDate.getMinutes());
      
      setSelectedDate(`${year}-${month}-${day}`);
      setSelectedTime(`${hours}:${minutes}`);
      setNotes(myQuote.notes || '');
    }
    
    // Then open the edit modal
    setShowScheduleEditModal(true);
  };

  // Helper function to navigate to appointment from schedule
  const navigateToAppointmentFromSchedule = (appointment: AppointmentWithRelations) => {
    // Set flag to indicate this appointment was accessed from schedule
    setIsFromSchedule(true);
    
    // Check if this is a past-ETA appointment that needs to be restored
    if (isPastETA(appointment) && !isRestoredToday(appointment.id)) {
      handleRestoreAppointment(appointment);
      toast({
        title: "Appointment Restored",
        description: "This appointment has been restored to your upcoming appointments for today.",
      });
    }
    
    // Find the appointment in available appointments
    const availableIndex = availableAppointments.findIndex(apt => apt.id === appointment.id)
    if (availableIndex !== -1) {
      setCurrentAvailableIndex(availableIndex)
      
      // For mobile, scroll to available appointments section
      if (isMobile) {
        const availableSection = document.querySelector('[data-section="available-appointments"]')
        if (availableSection) {
          availableSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          
          // Add visual feedback
          availableSection.classList.add('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
          setTimeout(() => {
            availableSection.classList.remove('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
          }, 2000)
          
          toast({
            title: "Appointment Found",
            description: "Scrolled to available appointments section",
          });
        }
      }
      return
    }
    
    // Find the appointment in the FILTERED upcoming appointments (not the original array)
    const filteredUpcomingIndex = filteredUpcomingAppointments.findIndex(apt => apt.id === appointment.id)
    if (filteredUpcomingIndex !== -1) {
      // Set the clicked appointment as the active one in upcoming appointments
      setCurrentUpcomingIndex(filteredUpcomingIndex)
      
      // Enhanced scrolling for mobile devices
      const upcomingSection = document.querySelector('[data-section="upcoming-appointments"]')
      if (upcomingSection) {
        if (isMobile) {
          // For mobile, scroll with better positioning and add visual feedback
          upcomingSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
          
          // Add a brief highlight effect to the section
          upcomingSection.classList.add('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
          setTimeout(() => {
            upcomingSection.classList.remove('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
          }, 2000)
          
          toast({
            title: "Appointment Found",
            description: "Scrolled to upcoming appointments section",
          });
        } else {
          // Desktop behavior - smooth scroll
          upcomingSection.scrollIntoView({ behavior: 'smooth' })
        }
      }
      return
    }
    
    // If not found in filtered appointments, it might be filtered out
    // Try to find it in the original upcoming appointments and restore it if needed
    const originalUpcomingIndex = upcomingAppointments.findIndex(apt => apt.id === appointment.id)
    if (originalUpcomingIndex !== -1) {
      // This appointment exists but is filtered out - restore it and set as current
      handleRestoreAppointment(appointment);
      // After restoration, it should appear in filtered appointments
      // We'll need to wait for the next render cycle to find the correct index
      setTimeout(() => {
        const newFilteredIndex = filteredUpcomingAppointments.findIndex(apt => apt.id === appointment.id);
        if (newFilteredIndex !== -1) {
          setCurrentUpcomingIndex(newFilteredIndex);
          
          // Scroll to the section after restoration
          const upcomingSection = document.querySelector('[data-section="upcoming-appointments"]')
          if (upcomingSection && isMobile) {
            upcomingSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            })
            
            // Add visual feedback
            upcomingSection.classList.add('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
            setTimeout(() => {
              upcomingSection.classList.remove('ring-2', 'ring-[#294a46]', 'ring-opacity-50')
            }, 2000)
          }
        }
      }, 100);
      
      toast({
        title: "Appointment Restored",
        description: "This appointment has been restored to your upcoming appointments.",
      });
      return;
    }
  };

  const handleScheduleCancelSubmit = async () => {
    try {
      const currentAppointment = filteredUpcomingAppointments[currentUpcomingIndex];
      if (!currentAppointment) return;

      // Update appointment with cancellation details
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'mechanic',
          cancellation_reason: cancellationReason,
          cancellation_type: cancellationType
        })
        .eq('id', currentAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: cancellationType === 'customer' 
          ? "Customer will receive a full refund. A cancellation fee will be charged to the customer."
          : "Customer will receive a full refund. You will be charged a cancellation fee.",
      });

      setShowScheduleCancelModal(false);
      setCancellationReason('');
      setCancellationType('customer');
      setIsFromSchedule(false);
      await fetchInitialAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleEditSubmit = async () => {
    try {
      const currentAppointment = filteredUpcomingAppointments[currentUpcomingIndex];
      if (!currentAppointment) return;

      const myQuote = currentAppointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
      if (!myQuote) return;

      // Combine date and time
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const etaDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();

      const { error } = await supabase
        .from('mechanic_quotes')
        .update({
          price: parseFloat(priceInput),
          eta: etaDateTime,
          notes: notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', myQuote.id);

      if (error) throw error;

      toast({
        title: "Quote Updated",
        description: "Your quote has been updated successfully.",
      });

      setShowScheduleEditModal(false);
      setIsFromSchedule(false);
      await fetchInitialAppointments();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Reset restored appointments at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      setRestoredToday(new Set());
    }, timeUntilMidnight);
    
    return () => clearTimeout(timer);
  }, []);

  // Helper functions for default date/time
  const getDefaultDate = (): string => {
    const today = new Date();
    const currentHour = today.getHours();
    
    // If current time is past 8 PM, automatically set to next day
    if (currentHour >= 20) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
    
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Helper function to pad numbers
  const pad = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };

  // Helper function to parse datetime string as local time (no timezone conversion)
  const parseLocalDateTime = (dateTimeString: string): Date => {
    console.log('🕒 [TIMEZONE DEBUG] parseLocalDateTime called with:', dateTimeString);
    
    // Check if it's a datetime string with 'T' separator
    if (dateTimeString.includes('T')) {
      const [datePart, timePart] = dateTimeString.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const timeParts = timePart.split(':');
      const [hours, minutes] = timeParts.map(Number);
      const seconds = timeParts[2] ? Number(timeParts[2]) : 0;
      
      console.log('🕒 [TIMEZONE DEBUG] Parsed components:', { year, month, day, hours, minutes, seconds });
      
      // Create date in local timezone (no timezone conversion)
      const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
      console.log('🕒 [TIMEZONE DEBUG] Created local date:', localDate.toLocaleString());
      return localDate;
    } else {
      // Fallback to regular Date constructor for other formats
      console.log('🕒 [TIMEZONE DEBUG] Using fallback Date constructor');
      return new Date(dateTimeString);
    }
  };

  const getDefaultTime = (appointment?: AppointmentWithRelations): string => {
    // If we have an appointment, use the customer's actual requested time
    if (appointment?.appointment_date) {
      try {
        const appointmentDate = parseLocalDateTime(appointment.appointment_date);
        const hours = pad(appointmentDate.getHours());
        const minutes = pad(appointmentDate.getMinutes());
        console.log('🕒 Using customer requested time:', `${hours}:${minutes}`, 'from appointment_date:', appointment.appointment_date);
        return `${hours}:${minutes}`;
      } catch (error) {
        console.warn('🕒 Error parsing appointment_date, falling back to current time:', error);
      }
    }

    // Fallback to current time (not rounded down - exact current time)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Ensure it's within business hours (8 AM - 8 PM)
    let defaultHour = currentHour;
    let defaultMinute = currentMinute;
    
    if (currentHour < 8) {
      defaultHour = 8; // If before 8 AM, default to 8:00 AM
      defaultMinute = 0;
    } else if (currentHour >= 20) {
      defaultHour = 8; // If after 8 PM, default to 8:00 AM next day
      defaultMinute = 0;
    }
    
    const fallbackTime = `${pad(defaultHour)}:${pad(defaultMinute)}`;
    console.log('🕒 Using fallback current time:', fallbackTime);
    return fallbackTime;
  };

  const [selectedDate, setSelectedDate] = useState(getDefaultDate())
  const [selectedTime, setSelectedTime] = useState(getDefaultTime())
  const [showETAError, setShowETAError] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Add notification state at the top of the component
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Add new state variables after the existing ones
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Add new state variables after the existing ones
  const [startingAppointment, setStartingAppointment] = useState<AppointmentWithRelations | null>(null);
  const [etaMinutes, setEtaMinutes] = useState('30');
  const [isStarting, setIsStarting] = useState(false);

  // Add new state variables after the existing ones
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAppointment, setEditAppointment] = useState<AppointmentWithRelations | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Refer a Friend modal state
  const [showReferModal, setShowReferModal] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Schedule click tracking state
  const [isFromSchedule, setIsFromSchedule] = useState<boolean>(false);
  const [showScheduleCancelModal, setShowScheduleCancelModal] = useState<boolean>(false);
  const [showScheduleEditModal, setShowScheduleEditModal] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancellationType, setCancellationType] = useState<'customer' | 'mechanic'>('customer');

  // Helper function to check if appointment is within 2 days (for schedule-accessed appointments)
  const isWithinTwoDays = (appointment: AppointmentWithRelations): boolean => {
    const appointmentDate = parseLocalDateTime(appointment.appointment_date);
    const today = new Date();
    
    // Set both dates to midnight for accurate day comparison
    const appointmentMidnight = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate difference in days
    const diffTime = todayMidnight.getTime() - appointmentMidnight.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return true if within 2 days (including the appointment day and 2 days after)
    return diffDays >= -1 && diffDays <= 2;
  };

  // Update selectedDate and selectedTime when current available appointment changes
  useEffect(() => {
    if (availableAppointments.length > 0 && availableAppointments[currentAvailableIndex]) {
      const currentAppointment = availableAppointments[currentAvailableIndex];
      console.log('🕒 Current appointment changed, updating date/time to customer requested time');
      console.log('🕒 Appointment:', currentAppointment.id, 'Date:', currentAppointment.appointment_date);
      
      // Update date to customer's requested date
      if (currentAppointment.appointment_date) {
        try {
          const appointmentDate = parseLocalDateTime(currentAppointment.appointment_date);
          const dateString = appointmentDate.toISOString().split('T')[0];
          setSelectedDate(dateString);
          console.log('🕒 Set selectedDate to customer requested:', dateString);
        } catch (error) {
          console.warn('🕒 Error parsing appointment date:', error);
          setSelectedDate(getDefaultDate());
        }
      }
      
      // Update time to customer's requested time
      setSelectedTime(getDefaultTime(currentAppointment));
    }
  }, [currentAvailableIndex, availableAppointments]);

  // Ensure currentAvailableIndex is always valid when availableAppointments changes
  useEffect(() => {
    if (availableAppointments.length > 0 && currentAvailableIndex >= availableAppointments.length) {
      setCurrentAvailableIndex(0);
    }
  }, [availableAppointments.length, currentAvailableIndex]);



  // Add showNotification function
  const showNotification = (message: string, type: NotificationState['type'] = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  // Copy link to clipboard function
  const copyLinkToClipboard = async () => {
    const landingPageUrl = window.location.origin;
    
    try {
      await navigator.clipboard.writeText(landingPageUrl);
      setIsLinkCopied(true);
      showNotification('Link copied! Thank you for sharing.', 'success');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      showNotification('Failed to copy link. Please try again.', 'error');
    }
  };

  // Comprehensive search function
  const searchAppointments = (appointments: AppointmentWithRelations[], query: string): AppointmentWithRelations[] => {
    if (!query.trim()) return appointments;
    
    const searchTerm = query.toLowerCase().trim();
    
    return appointments.filter(appointment => {
      // Create a comprehensive search string from all relevant fields
      const searchableText = [
        // Vehicle info
        appointment.vehicles?.year?.toString() || '',
        appointment.vehicles?.make || '',
        appointment.vehicles?.model || '',
        appointment.vehicles?.vin || '',
        appointment.vehicles?.mileage?.toString() || '',
        
        // Appointment details
        appointment.location || '',
        appointment.issue_description || '',
        appointment.appointment_date ? parseLocalDateTime(appointment.appointment_date).toLocaleDateString() : '',
        appointment.appointment_date ? parseLocalDateTime(appointment.appointment_date).toLocaleTimeString() : '',
        
        // Services and issues
        ...(appointment.selected_services || []),
        ...(appointment.selected_car_issues || []),
        
        // Status and quotes
        appointment.status || '',
        appointment.payment_status || '',
        appointment.mechanic_quotes?.map(q => q.price?.toString() || '').join(' ') || '',
        appointment.mechanic_quotes?.map(q => q.eta ? new Date(q.eta).toLocaleString() : '').join(' ') || '',
        appointment.mechanic_quotes?.map(q => q.notes || '').join(' ') || '',
        
        // Car status
        appointment.car_runs !== null ? (appointment.car_runs ? 'running' : 'not running') : '',
        
        // Quote info
        appointment.quote?.price?.toString() || '',
        appointment.quote?.created_at ? new Date(appointment.quote.created_at).toLocaleString() : ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  };

  // Get filtered appointments
  const filteredAvailableAppointments = useMemo(() => 
    searchAppointments(availableAppointments, searchQuery), 
    [availableAppointments, searchQuery]
  );

  const filteredUpcomingAppointments = useMemo(() => {
    const visibleAppointments = upcomingAppointments.filter(shouldShowInUpcoming);
    // Include cancelled appointments so they appear in the schedule
    return searchAppointments(visibleAppointments, searchQuery);
  }, [upcomingAppointments, searchQuery, restoredToday]);

  // Ensure currentUpcomingIndex is always valid when filtered appointments change
  useEffect(() => {
    if (filteredUpcomingAppointments.length > 0 && currentUpcomingIndex >= filteredUpcomingAppointments.length) {
      setCurrentUpcomingIndex(0);
    } else if (filteredUpcomingAppointments.length === 0) {
      setCurrentUpcomingIndex(0);
    }
  }, [filteredUpcomingAppointments.length, currentUpcomingIndex]);

  // Clear search function
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Helper function to format price - show whole numbers without .00
  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? `$${price.toFixed(0)}` : `$${price.toFixed(2)}`;
  };

  // Generate available dates (next 7 days)
  const getAvailableDates = (): DateOption[] => {
    const dates: DateOption[] = [];
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

  // Generate time slots (8 AM to 8 PM, 15-minute increments)
  // For TODAY: Only show times from current hour onwards (no past times)
  // For FUTURE DATES: Show all times (full day available)
  const getTimeSlots = (forDate?: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Determine if we're generating slots for today
    const isToday = forDate === today;
    
    for (let hour = 8; hour < 20; hour++) { // Changed from 18 to 20 (8 PM)
      for (let minute = 0; minute < 60; minute += 15) {
        // For today: Skip times that have already passed
        if (isToday) {
          // Skip if hour has passed
          if (hour < currentHour) continue;
          // Skip if same hour but minute has passed
          if (hour === currentHour && minute < currentMinute) continue;
        }
        
        const time = `${pad(hour)}:${pad(minute)}`;
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  // Helper to check if a pending appointment is overdue
  function isPendingAndOverdue(appointment: AppointmentWithRelations) {
    if (appointment.status !== 'pending') return false;
    if (!appointment.appointment_date) return false;
    const appointmentTime = parseLocalDateTime(appointment.appointment_date).getTime();
    const now = Date.now();
    return now - appointmentTime > 15 * 60 * 1000; // 15 minutes in ms
  }

  const fetchInitialAppointments = async () => {
    if (!mechanicId) return;

    try {
      setIsAppointmentsLoading(true);

      // STEP 1: Get all pending appointments first with ALL fields
      console.log('🔍 Fetching all pending appointments before filtering...');
      
      // Test 1: Just appointments
      const { data: test1, error: error1 } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending');
      console.log('Test 1 - Basic query:', { data: test1?.length, error: error1 });
      
      if (error1) {
        console.error('❌ DETAILED ERROR Test 1:', error1.message, error1.details, error1.hint);
        console.error('Full error object:', JSON.stringify(error1, null, 2));
      }
      
      // Test 2: Add users join with explicit foreign key (using only existing columns)
      const { data: test2, error: error2 } = await supabase
        .from('appointments')
        .select(`
          *,
          users!appointments_user_id_fkey (
            email,
            phone
          )
        `)
        .eq('status', 'pending');
      console.log('Test 2 - With users (explicit FK):', { data: test2?.length, error: error2 });
      
      if (error2) {
        console.error('❌ DETAILED ERROR Test 2:', error2.message, error2.details, error2.hint);
        console.error('Full error object:', JSON.stringify(error2, null, 2));
      }
      
      // Test 2b: Add users join with simpler syntax (using only existing columns)
      const { data: test2b, error: error2b } = await supabase
        .from('appointments')
        .select(`
          *,
          users (
            email,
            phone
          )
        `)
        .eq('status', 'pending');
      console.log('Test 2b - With users (simple):', { data: test2b?.length, error: error2b });
      
      if (error2b) {
        console.error('❌ DETAILED ERROR Test 2b:', error2b.message, error2b.details, error2b.hint);
        console.error('Full error object:', JSON.stringify(error2b, null, 2));
      }
      
      // Test 3: Add vehicles (this might be the problem)
      const { data: test3, error: error3 } = await supabase
        .from('appointments')
        .select(`
          *,
          users!appointments_user_id_fkey (
            email,
            phone
          ),
          vehicles!fk_appointment_id (*)
        `)
        .eq('status', 'pending');
      console.log('Test 3 - With vehicles:', { data: test3?.length, error: error3 });
      
      if (error3) {
        console.error('❌ DETAILED ERROR Test 3:', error3.message, error3.details, error3.hint);
        console.error('Full error object:', JSON.stringify(error3, null, 2));
      }
      
      // Use the working query result (prioritize simpler queries if complex ones fail)
      const allPendingAppointments = error3 ? (error2b ? test2b : (error2 ? test1 : test2)) : test3;
      const appointmentsError = error3 || error2b || error2 || error1;
        
      console.log('🔍 RAW APPOINTMENT DATA:', allPendingAppointments?.slice(0, 2));

      // DEBUG: Check what columns actually exist in appointments table
      console.log('🔍 Checking available columns in appointments table...');
      const { data: testAppt } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);
      
      console.log('Available columns:', testAppt ? Object.keys(testAppt[0]) : 'No appointments');
      
      // DEBUG: Check what columns actually exist in users table
      console.log('🔍 Checking available columns in users table...');
      const { data: testUser } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      console.log('Users table columns:', testUser ? Object.keys(testUser[0]) : 'No users');

      // DEBUG: Check for edited appointments that should be available
      console.log('🔍 Checking for edited appointments that should be available...');
      const { data: editedAppointments }: { data: EditedAppointmentResult[] | null } = await supabase
        .from('appointments')
        .select('id, status, edited_after_quotes')
        .eq('status', 'pending')
        .eq('edited_after_quotes', true);

      console.log('📝 Found edited appointments:', editedAppointments);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        return;
      }

      // STEP 2: Get appointments this mechanic has SKIPPED
      const { data: skippedAppointments, error: skippedError } = await supabase
        .from('mechanic_skipped_appointments')
        .select('appointment_id')
        .eq('mechanic_id', mechanicId);

      if (skippedError) {
        console.error('Error fetching skipped appointments:', skippedError);
      }

      const skippedIds = skippedAppointments?.map((s: { appointment_id: string }) => s.appointment_id) || [];
      console.log('🚫 Mechanic has skipped these appointments:', skippedIds);

      // STEP 3: Use the edited appointments data from the first query
      const editedIds = editedAppointments?.map(a => a.id) || [];
      console.log('✏️ Edited appointments that need to be shown:', editedIds);

      // STEP 4: Get appointments this mechanic has QUOTED on
      const { data: quotedAppointments, error: quotedError } = await supabase
        .from('mechanic_quotes')
        .select('appointment_id')
        .eq('mechanic_id', mechanicId)
        // Remove any status filter that might be causing issues
        // .eq('status', 'active')  

      if (quotedError) {
        console.error('Error fetching quoted appointments:', quotedError);
      }

      // Add debug logging
      console.log('🔍 DEBUG: Quoted appointments query result:', quotedAppointments);

      // Filter out quotes for edited appointments
      const validQuotedIds = quotedAppointments
        ?.filter((q: { appointment_id: string }) => !editedIds.includes(q.appointment_id))
        .map((q: { appointment_id: string }) => q.appointment_id) || [];

      console.log('💬 Mechanic has quoted on these appointments (excluding edited):', validQuotedIds);

      // STEP 5: Show edited appointments even if previously quoted
      console.log('🔍 Starting filtering process...');
      console.log('📊 Total pending appointments:', allPendingAppointments?.length || 0);
      console.log('🚫 Skipped appointment IDs:', skippedIds);
      console.log('💬 Valid quoted appointment IDs:', validQuotedIds);
      console.log('✏️ Edited appointment IDs:', editedIds);
      
      const availableAppointments = allPendingAppointments?.filter((apt: any) => {
        const isSkipped = skippedIds.includes(apt.id);
        const isQuoted = validQuotedIds.includes(apt.id) && !apt.edited_after_quotes;
        
        if (isSkipped) {
          console.log(`⏭️ Filtering out skipped appointment: ${apt.id}`);
        }
        if (isQuoted) {
          console.log(`💬 Filtering out quoted appointment: ${apt.id}`);
        }
        
        if (apt.edited_after_quotes) {
          console.log(`✏️ Including edited appointment: ${apt.id}`);
        }
        
        const shouldInclude = !isSkipped && !isQuoted;
        if (shouldInclude) {
          console.log(`✅ Including appointment: ${apt.id} (edited: ${apt.edited_after_quotes})`);
        }
        
        return shouldInclude; // Only show if NOT skipped AND NOT quoted (unless edited)
      }) || [];

      console.log(`✅ Available appointments after filtering: ${availableAppointments.length}`);
      setAvailableAppointments(availableAppointments);

      // ADD THIS MISSING SECTION FOR UPCOMING APPOINTMENTS
      console.log('🔍 Fetching UPCOMING appointments for mechanic...');

      // WRONG - 'active' might not exist
      // .eq('status', 'active')

      // CORRECT - Use the actual status values
      // Step 1: Get all quotes (no status filter)
      const { data: myQuotes } = await supabase
        .from('mechanic_quotes')
        .select('*')
        .eq('mechanic_id', mechanicId)

      console.log(`Found ${myQuotes?.length} total quotes`);
      console.log('📊 All my quotes (no status filter):', myQuotes);
      console.log('📊 Quote statuses:', myQuotes?.map((q: any) => ({ id: q.id, status: q.status })));

      // Then use the correct statuses
      const validQuotes = myQuotes?.filter((q: any) => 
        ['pending', 'submitted', 'accepted'].indexOf(q.status) !== -1
      );

              // Step 2: Get appointments for those quotes
        if (validQuotes && validQuotes.length > 0) {
          const appointmentIds = validQuotes.map((q: any) => q.appointment_id);
          
                  const { data: appointments, error: upcomingError } = await supabase
          .from('appointments')
          .select(`
            *,
            users (
              email,
              phone
            ),
            vehicles!fk_appointment_id (*)
          `)
          .in('id', appointmentIds)
          
        if (upcomingError) {
          console.error('❌ DETAILED ERROR Upcoming appointments:', upcomingError.message, upcomingError.details, upcomingError.hint);
          console.error('Full error object:', JSON.stringify(upcomingError, null, 2));
        }
          
        console.log('🔍 RAW UPCOMING APPOINTMENT DATA:', appointments?.slice(0, 2));
        
        // Step 3: Combine them properly and exclude edited appointments
        const upcomingWithQuotes = appointments?.map((apt: any) => {
          const quote = validQuotes.find((q: any) => q.appointment_id === apt.id);
          // LOG WHAT WE'RE ATTACHING
          if (quote) {
            console.log(`📊 Attaching quote to appointment ${apt.id}:`, {
              quote_id: quote.id,
              price: quote.price,
              eta: quote.eta
            });
          }
          return {
            ...apt,
            mechanic_quotes: quote ? [quote] : [] // Always attach as array
          };
        }).filter((apt: any) => {
          // EXCLUDE appointments that were edited after quotes
          if (apt.edited_after_quotes === true) {
            console.log(`🚫 Excluding edited appointment from upcoming: ${apt.id}`);
            return false;
          }
          return true;
        }) || [];

        console.log(`📊 Upcoming appointments after filtering edited: ${upcomingWithQuotes.length}`);
        setUpcomingAppointments(upcomingWithQuotes);
        
        // Add this debug log to see what data structure we have
        console.log('🔍 UPCOMING APPOINTMENTS DATA STRUCTURE:', 
          upcomingWithQuotes.slice(0, 2).map((apt: any) => ({
            id: apt.id,
            mechanic_quotes: apt.mechanic_quotes,
            price: apt.mechanic_quotes?.[0]?.price,
            eta: apt.mechanic_quotes?.[0]?.eta,
            hasQuoteData: !!apt.mechanic_quotes
          }))
        );
      }

    } catch (error) {
      console.error('Error in fetchInitialAppointments:', error);
    } finally {
      setIsAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (!session?.user) {
          router.push('/login')
          return
        }

        setUserId(session.user.id)
        setIsLoggedIn(true)
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Auth check failed:', errorMessage)
        router.push('/login')
      } finally {
        // Set auth loading to false after auth check completes
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

  // NEW: Add debug tracking for mechanicId changes
  useEffect(() => {
    console.log("🎯 MECHANIC ID STATE CHANGE DETECTED:", {
      mechanicId,
      type: typeof mechanicId,
      isNull: mechanicId === null,
      isUndefined: mechanicId === undefined,
      timestamp: new Date().toISOString(),
      mechanicProfile: mechanicProfile?.id
    });
    
    // Check if mechanicId was set and then lost
    if (mechanicProfile?.id && !mechanicId) {
      console.error("🚨 CRITICAL: mechanicProfile exists but mechanicId is missing!", {
        mechanicProfileId: mechanicProfile.id,
        mechanicId: mechanicId
      });
    }
  }, [mechanicId, mechanicProfile])

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

    // CRITICAL FIX: Use new validation return format
    const validation = validateMechanicId(mechanicId);
    if (!validation.isValid) {
      console.error("❌ Invalid mechanicId, redirecting to login:", validation.error)
      setError(`Invalid mechanic ID: ${validation.error}`)
          toast({
        title: "Error",
        description: `Invalid mechanic ID: ${validation.error}. Please try logging in again.`,
            variant: "destructive",
          })
      window.location.href = "/login"
          return
        }

    // Note: Real-time subscriptions are now handled in the useMechanicAppointments hook
    // This eliminates duplicate subscriptions and improves performance
    
    // Initial setup
    fetchInitialAppointments()

    // Cleanup function for any local resources
    return () => {
      console.log("🧹 Dashboard cleanup")
    }
  }, [mechanicId])

  // Real-time subscription for instant updates
  useEffect(() => {
   if (!mechanicId) return

   console.log('🔄 Setting up real-time subscriptions for mechanic:', mechanicId)
   
   // Subscribe to appointments table changes
   const appointmentsSubscription = supabase
    .channel('appointments-changes')
    .on(
     'postgres_changes',
     {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'appointments'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Appointment change detected:', payload)
      console.log('📝 Appointment was edited by customer:', payload);
      
      // Force complete data refresh with fresh data
      console.log('🔄 Forcing complete data refresh after appointment change...');
      fetchInitialAppointments();
     }
    )
    .subscribe()

   // Subscribe to mechanic quotes changes
   const quotesSubscription = supabase
    .channel('quotes-changes')
    .on(
     'postgres_changes',
     {
      event: '*', // Listen to all events
      schema: 'public',
      table: 'mechanic_quotes'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Quote change detected:', payload)
      // Refresh appointments when quotes change
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to mechanic skipped appointments changes
   const skipsSubscription = supabase
    .channel('skips-changes')
    .on(
     'postgres_changes',
     {
      event: '*',
      schema: 'public',
      table: 'mechanic_skipped_appointments'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Skip change detected:', payload)
      // Refresh appointments when skips change
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to appointment updates for editing notifications
   const appointmentUpdatesSubscription = supabase
    .channel('appointment-updates')
    .on(
     'postgres_changes',
     {
      event: 'INSERT', // Listen to new appointment updates
      schema: 'public',
      table: 'appointment_updates'
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📡 Appointment update detected:', payload)
      
      // Show notification to mechanic
      toast({
       title: "Appointment Updated",
       description: `Appointment ${payload.new.appointment_id} was updated. Please re-quote if interested.`,
       variant: "default",
      })
      
      // Refresh appointments list
      fetchInitialAppointments()
     }
    )
    .subscribe()

   // Subscribe to appointment edits by customers
   const appointmentEditsSubscription = supabase
    .channel('appointment-edits')
    .on(
     'postgres_changes',
     {
      event: 'UPDATE',
      schema: 'public',
      table: 'appointments',
      filter: `edited_after_quotes=eq.true`
     },
     (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📝 Appointment was edited by customer:', payload)
      
      // Show notification to mechanic
      toast({
       title: "Appointment Edited",
       description: "An appointment you quoted was edited by the customer. Refreshing data...",
       variant: "default",
      })
      
      // Force complete data refresh with fresh data
      console.log('🔄 Forcing complete data refresh after appointment edit...');
      fetchInitialAppointments();
     }
    )
    .subscribe()

   console.log('✅ Real-time subscriptions established')

   return () => {
    console.log('🔄 Cleaning up real-time subscriptions')
    appointmentsSubscription.unsubscribe()
    quotesSubscription.unsubscribe()
    skipsSubscription.unsubscribe()
    appointmentUpdatesSubscription.unsubscribe()
    appointmentEditsSubscription.unsubscribe()
   }
  }, [mechanicId])

  // Add useEffect to load mechanic profile ONLY after auth is complete
  useEffect(() => {
    // Only run after auth is complete and user is authenticated
    if (isAuthLoading || !userId) {
          return
        }

    const loadMechanicProfile = async () => {
      try {
        console.log('🔄 Loading mechanic profile for user:', userId);
        console.log('🔄 MECHANIC PROFILE LOAD START - Current state:', {
          userId,
          mechanicId: mechanicId,
          mechanicProfile: mechanicProfile,
          isMechanicLoading: isMechanicLoading
        });
        setIsMechanicLoading(true);
        
        const { data: profile, error: profileError } = await supabase
          .from('mechanic_profiles')
          .select('id, user_id, first_name, last_name')
          .eq('user_id', userId)
          .single();

        console.log('🔄 MECHANIC PROFILE DB RESPONSE:', {
          profile: profile,
          error: profileError,
          hasProfile: !!profile,
          profileId: profile?.id,
          profileUserId: profile?.user_id
        });

        if (profileError) {
          console.error('❌ Error loading mechanic profile:', profileError);
          if (profileError.code === 'PGRST116') {
            // No mechanic profile found - redirect to onboarding
            console.log('📝 No mechanic profile found, redirecting to onboarding');
            router.push('/onboarding-mechanic-1');
            return;
          }
          setError('Failed to load mechanic profile');
          return;
        }

        if (!profile) {
          console.error('❌ No mechanic profile found for user:', userId);
          router.push('/onboarding-mechanic-1');
          return;
        }

        console.log('✅ Mechanic profile loaded successfully:', {
          userId: userId,
          mechanicProfileId: profile.id,
          mechanicName: `${profile.first_name} ${profile.last_name}`
        });

        console.log('🎯 SETTING MECHANIC ID TO:', profile.id);
        
        // CRITICAL FIX: Set both state values together
        setMechanicId(profile.id);
        setMechanicProfile(profile);
        
        console.log('🎯 AFTER setState - mechanicId should be:', profile.id);
        
      } catch (error) {
        console.error('❌ Error in loadMechanicProfile:', error);
        setError('Failed to load mechanic profile');
      } finally {
        setIsMechanicLoading(false);
        console.log('🎯 MECHANIC LOADING: Set to false');
      }
    };

    loadMechanicProfile();
  }, [userId, isAuthLoading, router]); // CRITICAL: Add mechanicId dependency if needed for re-runs

  // Add debug function for mechanic profile
  const debugMechanicProfile = async (): Promise<any> => {
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
  const createMechanicProfile = async (): Promise<any> => {
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
  const handleSubmitQuote = async (appointmentId: string, price: number, eta: string, notes?: string): Promise<void> => {
    try {
      setIsProcessing(true);
      console.log('🎯 === QUOTE SUBMISSION DEBUG ===');
      console.log('1. Starting quote submission with:', {
        appointmentId,
        price,
        eta,
        notes,
        mechanicId,
        mechanicIdType: typeof mechanicId,
        isMechanicLoading
      });

      // CRITICAL: Check if mechanicId is available
      if (!mechanicId) {
        console.error('❌ CRITICAL: mechanicId is undefined!', {
          mechanicId,
          mechanicProfile,
          isMechanicLoading,
          isAuthLoading
        });
        
        if (isMechanicLoading) {
            toast({
            title: "Please wait",
            description: "Loading your mechanic profile...",
              variant: "destructive",
          });
          return;
        } else {
          toast({
            title: "Profile Error",
            description: "Unable to load your mechanic profile. Please refresh the page.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('2. mechanicId validation passed:', mechanicId);

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
      const etaDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
      
      console.log('3. Creating quote with validated mechanicId:', {
        mechanic_id: mechanicId,
        appointment_id: appointmentId,
        price,
        eta: etaDateTime,
        notes
      });

      // DEEP DEBUG: Log everything right before the call
      console.log('=== FINAL QUOTE SUBMISSION DEBUG ===');
      console.log('mechanicId:', mechanicId);
      console.log('typeof mechanicId:', typeof mechanicId);
      console.log('mechanicId === null:', mechanicId === null);
      console.log('mechanicId === undefined:', mechanicId === undefined);
      console.log('mechanicProfile:', mechanicProfile);
      console.log('mechanicProfile?.id:', mechanicProfile?.id);
      console.log('isMechanicLoading:', isMechanicLoading);
      console.log('isAuthLoading:', isAuthLoading);
      console.log('userId:', userId);
      
      // Get current user to compare
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current auth user:', user);
      console.log('User error:', userError);

      // Submit quote with verified mechanic ID and ISO timestamp
      const { success, error } = await createOrUpdateQuote(
        mechanicId,
        appointmentId,
        price,
        etaDateTime,
        notes
      );

      console.log('4. Quote submission result:', {
        success,
        error,
        mechanicId,
        appointmentId
      });

      if (!success) {
        console.error('❌ Quote submission failed:', error);
        throw new Error(error);
      }

      console.log('✅ Quote submitted successfully!');

      // Clear edit flag if appointment was edited after quotes
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('edited_after_quotes')
        .eq('id', appointmentId)
        .single();

      if (appointmentData?.edited_after_quotes) {
        console.log('📝 Clearing edit flag for appointment that was edited after quotes');
        const { error: clearError } = await supabase
          .from('appointments')
          .update({ 
            edited_after_quotes: false,
            mechanic_notified_of_edit: false 
          })
          .eq('id', appointmentId);
        
        if (clearError) {
          console.error('⚠️ Warning: Could not clear edit flag:', clearError);
        } else {
          console.log('✅ Edit flag cleared successfully');
        }
      }

      // Verify the quote was actually created
      const { data: verifyQuote, error: verifyError } = await supabase
        .from('mechanic_quotes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('mechanic_id', mechanicId)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('5. Quote verification:', {
        verifyQuote,
        verifyError,
        appointmentId,
        mechanicId
      });

      toast({
        title: "Success",
        description: "Quote submitted successfully!",
      });

      // Reset form to defaults
      setPriceInput("");
      setSelectedDate(getDefaultDate());
      setSelectedTime(getDefaultTime());
      setShowETAError(false);

      // IMMEDIATELY remove from available appointments
      setAvailableAppointments(prev => 
        prev.filter(apt => apt.id !== appointmentId)
      );
      
      // Then fetch fresh data
      console.log('🔄 === REFRESHING APPOINTMENTS AFTER QUOTE SUBMISSION ===');
      console.log('6. About to call fetchInitialAppointments() to refresh lists...');
      await fetchInitialAppointments();
      console.log('7. fetchInitialAppointments() completed - lists should be updated');
      console.log('🔄 === QUOTE SUBMISSION REFRESH COMPLETE ===');
    } catch (error: unknown) {
      console.error("❌ Error submitting quote:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit quote. Please try again.";
        toast({
          title: "Error",
        description: errorMessage,
          variant: "destructive",
      });
      } finally {
      setIsProcessing(false);
    }
  };

  // Handle skipping an appointment
  const handleSkipAppointment = async (appointmentId: string) => {
    try {
      // Check if already skipped
      const { data: existingSkip } = await supabase
        .from('mechanic_skipped_appointments')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('mechanic_id', mechanicId)
        .single();

      if (existingSkip) {
        toast({
          title: "Error",
          description: "You have already skipped this appointment",
          variant: "destructive"
        });
        return;
      }

      // Create skip record
      const { error: skipError } = await supabase
        .from('mechanic_skipped_appointments')
        .insert({
          appointment_id: appointmentId,
          mechanic_id: mechanicId,
          skipped_at: new Date().toISOString()
        });

          if (skipError) throw skipError;

    toast({
      title: "Success",
      description: "Appointment skipped"
    });
      
      // IMPORTANT: Remove from local state immediately for instant feedback
      setAvailableAppointments((prev: AppointmentWithRelations[]) => 
        prev.filter((apt: AppointmentWithRelations) => apt.id !== appointmentId)
      );
      
      // Then fetch fresh data
      await fetchInitialAppointments();
      
      } catch (error) {
    console.error('Error skipping appointment:', error);
    toast({
      title: "Error",
      description: "Failed to skip appointment",
      variant: "destructive"
    });
  }
  };

  // Navigate through available appointments
  const goToNextAvailable = (): void => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev + 1) % availableAppointments.length)
      setPriceInput("")
    }
  }

  const goToPrevAvailable = (): void => {
    if (availableAppointments.length > 1) {
      setCurrentAvailableIndex((prev: number) => (prev === 0 ? availableAppointments.length - 1 : prev - 1))
      setPriceInput("")
    }
  }

  // Navigate through upcoming appointments
  const goToNextUpcoming = (): void => {
    if (filteredUpcomingAppointments.length > 1) {
      setCurrentUpcomingIndex((prev: number) => {
        const newIndex = (prev + 1) % filteredUpcomingAppointments.length;
        // Ensure the index is valid
        return newIndex >= 0 && newIndex < filteredUpcomingAppointments.length ? newIndex : 0;
      });
      setIsFromSchedule(false); // Reset flag when navigating normally
    }
  }

  const goToPrevUpcoming = (): void => {
    if (filteredUpcomingAppointments.length > 1) {
      setCurrentUpcomingIndex((prev: number) => {
        const newIndex = prev === 0 ? filteredUpcomingAppointments.length - 1 : prev - 1;
        // Ensure the index is valid
        return newIndex >= 0 && newIndex < filteredUpcomingAppointments.length ? newIndex : 0;
      });
      setIsFromSchedule(false); // Reset flag when navigating normally
    }
  }

  // Handle appointment click from schedule
  const handleScheduleAppointmentClick = (appointment: AppointmentWithRelations) => {
    if (appointment.status === 'cancelled') {
      if (!isRestoredToday(appointment.id)) {
        // First click: Restore (show) the appointment, then scroll to it
        handleRestoreAppointment(appointment);
        setTimeout(() => {
          navigateToAppointmentFromSchedule(appointment);
        }, 100); // Wait for state update
      } else {
        // Second click: Hide the appointment, don't navigate anywhere
        handleToggleCancelledAppointment(appointment);
        // No navigation since the appointment is now hidden
      }
      return;
    }
    // Use the helper function to navigate to the appointment
    navigateToAppointmentFromSchedule(appointment);
  }

  // Update handleUpdateQuote function
  const handleUpdateQuote = async (appointmentId: string) => {
    try {
      const myQuote = upcomingAppointments
        .find((apt) => apt.id === appointmentId)
        ?.mechanic_quotes
        ?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
      
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
      const appointment = upcomingAppointments.find((apt) => apt.id === appointmentId);
      const myQuote = appointment?.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
      
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
      setUpcomingAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));

      // Reset form state
      setSelectedAppointment(null);
      setPrice('');
      setSelectedDate(getDefaultDate());
      setSelectedTime(getDefaultTime());
      setNotes('');

      showNotification('Quote cancelled successfully', 'success');

    } catch (error) {
      console.error('22. Error in handleCancelQuote:', error);
      showNotification('Failed to cancel quote', 'error');
    }
  };

  // Add new handler functions before the return statement
  const handleStartAppointment = (appointment: AppointmentWithRelations) => {
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
      
      // Note: Customer notification system will be implemented in future update
      showNotification(`Job started! ETA: ${etaMinutes} minutes.`, 'success');
      
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

  const handleCancelConfirmedAppointment = async (appointment: AppointmentWithRelations, quotePrice: number) => {
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
      `You will be charged the full price if there is a no-show, unless you cancel the appointment.\n\n` +
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
              setUpcomingAppointments((prev) => prev.filter((apt) => apt.id !== appointment.id));
      
      showNotification(`Appointment cancelled. A $${cancellationFee} cancellation fee will be deducted from your account.`, 'info');
      
    } catch (error) {
      console.error('20. Error in cancellation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Failed to cancel appointment: ${errorMessage}`, 'error');
    }
  };

  // Add handleEditAppointment function
  const handleEditAppointment = (appointment: AppointmentWithRelations) => {
    const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
    
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
      
      const myQuote = editAppointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId);
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

  // Loading state - show loading while auth OR mechanic profile is loading
  if (isAuthLoading || isMechanicLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#294a46] mx-auto mb-4" />
            <p className="text-gray-600">
              {isAuthLoading ? "Loading your dashboard..." : "Loading your mechanic profile..."}
            </p>
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
          <div className="flex flex-col md:flex-row items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Mechanic Dashboard</h1>
            <div className="flex items-center gap-3">
              {mechanicProfile && <p className="text-lg text-gray-600">Welcome back, {mechanicProfile.first_name}!</p>}
              {/* Profile dropdown on mobile - next to welcome message */}
              <div className="md:hidden">
                <ProfileDropdown />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="Find appointments"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-full w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowReferModal(true)}
              className="bg-[#294a46] text-white px-3 sm:px-4 py-2 rounded-full hover:bg-[#1e3632] transition-colors flex items-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              Refer a friend
            </button>
            {/* Profile dropdown on desktop - in the actions area */}
            <div className="hidden md:block">
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 pb-12 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6" data-section="upcoming-appointments">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Upcoming Appointments
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                All appointments you've quoted on
              </p>
            </div>
            {(() => {
              console.log('🎯 UPCOMING APPOINTMENTS RENDER DEBUG:', {
                isAppointmentsLoading,
                upcomingAppointmentsLength: upcomingAppointments.length,
                filteredUpcomingLength: filteredUpcomingAppointments.length,
                searchQuery,
                willShowCards: !isAppointmentsLoading && filteredUpcomingAppointments.length > 0
              });
              return null;
            })()}
            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#294a46]" />
              </div>
            ) : filteredUpcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2 text-gray-900">
                  {searchQuery ? 'No Appointments Found' : 'No Upcoming Appointments'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? `No upcoming appointments match "${searchQuery}". Try a different search term.`
                    : 'You haven\'t quoted any appointments yet. New appointments will appear here when you submit a quote.'
                  }
                </p>
                {searchQuery && (
                  <button 
                    onClick={clearSearch}
                    className="mt-4 bg-[#294a46] text-white px-4 py-2 rounded-full hover:bg-[#1e3632] transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                {(() => {
                  console.log('🎯 RENDERING UPCOMING APPOINTMENT CARDS:', upcomingAppointments.length);
                  return null;
                })()}
                {/* Navigation buttons for multiple appointments */}
                {filteredUpcomingAppointments.length > 1 && (
                  <>
                    <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                      <button
                        onClick={goToPrevUpcoming}
                        className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                        aria-label="Previous appointment"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
                      <button
                        onClick={goToNextUpcoming}
                        className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                        aria-label="Next appointment"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}

                {/* Current appointment details */}
                {filteredUpcomingAppointments[currentUpcomingIndex] && (
                  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    {(() => {
                      const appointment = filteredUpcomingAppointments[currentUpcomingIndex];
                      
                      // Debug log for each appointment
                      console.log(`Rendering appointment ${appointment.id}:`, {
                        has_quote: !!appointment.mechanic_quotes,
                        price: appointment.mechanic_quotes?.[0]?.price,
                        eta: appointment.mechanic_quotes?.[0]?.eta
                      });
                      
                      const myQuote = appointment.mechanic_quotes?.[0];
                      const isSelected = appointment.selected_mechanic_id === mechanicId;
                      const isEditing = selectedAppointment?.id === appointment.id;
                      const isConfirmed = appointment.payment_status === 'paid' || appointment.status === 'confirmed';
                      
                      return (
                        <>
                          {/* Card Header with Price and Status */}
                          <div className="flex justify-between items-start mb-6">
                            {/* Price Quote */}
                            {myQuote && (
                              <div className="text-4xl font-bold text-[#294a46]">
                                {formatPrice(myQuote.price)}
                              </div>
                            )}
                            
                            {/* Status and ETA */}
                            <div className="text-right">
                              {appointment.status === 'cancelled' ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2 bg-red-100 text-red-800">
                                    ❌ Cancelled
                                  </span>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : appointment.status === 'pending' && !isSelected ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2 bg-yellow-100 text-yellow-800">
                                    ⏳ Pending
                                  </span>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : appointment.status === 'pending' && isSelected ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2 bg-blue-100 text-blue-800">
                                    ✓ Customer Selected - Awaiting Confirmation
                                  </span>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : appointment.status === 'confirmed' ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2" style={{ backgroundColor: '#294A46', color: 'white' }}>
                                    ✅ Confirmed
                                  </span>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : appointment.status === 'in_progress' ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm mb-2 bg-purple-100 text-purple-800">
                                    🔧 In Progress
                                  </span>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>ETA: {new Date(myQuote?.eta || '').toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                                  {appointment.status}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Vehicle Details */}
                          <div className="mb-6">
                            <div className="flex flex-col gap-2">
                              {/* Year, Make, Model Row */}
                              <div className="flex items-center gap-2 text-gray-900">
                                {appointment.vehicles?.year && (
                                  <span className="font-medium">{appointment.vehicles.year}</span>
                                )}
                                {appointment.vehicles?.make && (
                                  <span className="font-medium">{appointment.vehicles.make}</span>
                                )}
                                {appointment.vehicles?.model && (
                                  <span className="font-medium">{appointment.vehicles.model}</span>
                                )}
                              </div>
                              {/* VIN and Mileage Row */}
                              <div className="flex items-center gap-4 text-gray-600 text-sm">
                                {appointment.vehicles?.vin && (
                                  <span>VIN: {appointment.vehicles.vin}</span>
                                )}
                                {appointment.vehicles?.mileage && (
                                  <span>{appointment.vehicles.mileage.toLocaleString()} miles</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Location and Date */}
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center gap-2">
                              <GoogleMapsLink 
                                address={appointment.location}
                                latitude={appointment.latitude}
                                longitude={appointment.longitude}
                              />
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

                          {/* Selected Services - UPCOMING APPOINTMENTS (around line 2257) */}
                          <div className="mb-6">
                            <h4 className="text-sm font-medium mb-2 text-gray-900">Selected Services</h4>
                            <div className="flex flex-col gap-2">
                              {(appointment.selected_services && appointment.selected_services.length > 0) ? (
                                appointment.selected_services.map((service: string, index: number) => (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full w-fit"
                                  >
                                    {service}
                                  </span>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 italic">None Selected</p>
                              )}
                            </div>
                          </div>

                          {/* Car Issues */}
                          {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 ? (
                            <div className="mb-6">
                              <h4 className="text-sm font-medium mb-2 text-gray-900">Car Issues</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {appointment.selected_car_issues.map((issue: string, index: number) => (
                                  <span
                                    key={index}
                                    className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full text-center"
                                  >
                                    {formatCarIssue(issue)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-6">
                              <h4 className="text-sm font-medium mb-2 text-gray-900">Car Issues</h4>
                              <p className="text-sm text-gray-500 italic">No car issues selected</p>
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
                            {appointment.status === 'cancelled' ? (
                              <div className="flex-1 text-center text-gray-500 text-sm py-2 bg-gray-100 rounded-full">
                                Appointment Cancelled
                              </div>
                            ) : appointment.status === 'confirmed' || appointment.status === 'in_progress' ? (
                              <>
                                {isFromSchedule ? (
                                  <>
                                    {isWithinTwoDays(appointment) ? (
                                      <>
                                        <button
                                          onClick={() => handleScheduleEdit(appointment)}
                                          className="flex-1 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
                                          style={{ backgroundColor: '#294A46' }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleScheduleCancel(appointment)}
                                          className="flex-1 bg-red-600 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 hover:shadow-md active:scale-[0.99]"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <div className="flex-1 text-center text-gray-500 text-sm py-2">
                                        View-only (past 2-day limit)
                                      </div>
                                    )}
                                  </>
                                ) : (
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
                                )}
                              </>
                            ) : appointment.status === 'pending' ? (
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
                                        setSelectedDate(getDefaultDate());
                                        setSelectedTime(getDefaultTime());
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
                                    <button
                                      onClick={() => handleCancelQuote(appointment.id)}
                                      className="flex-1 bg-red-600 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 hover:shadow-md active:scale-[0.99]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex-1 text-center text-gray-500 text-sm py-2 bg-gray-100 rounded-full">
                                {appointment.status}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Pagination Dots */}
                {filteredUpcomingAppointments.length > 1 && (
                  <div className="flex justify-center mt-4">
                    <div className="flex space-x-2">
                      {filteredUpcomingAppointments.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentUpcomingIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentUpcomingIndex ? 'bg-[#294a46]' : 'bg-gray-300'
                          }`}
                          aria-label={`Go to appointment ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Schedule */}
          <MechanicSchedule 
            upcomingAppointments={upcomingAppointments}
            availableAppointments={availableAppointments}
            onAppointmentClick={handleScheduleAppointmentClick}
            isPastETA={isPastETA}
          />

          {/* Column 3: Available Appointments */}
          <div className="bg-[#294a46] rounded-lg shadow-sm p-6 text-white" data-section="available-appointments">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                Available Appointments
              </h2>
              <p className="text-sm text-white/70 mt-1">
                New appointments to quote
              </p>
            </div>
            {(() => {
              console.log('🎯 AVAILABLE APPOINTMENTS RENDER DEBUG:', {
                isAppointmentsLoading,
                availableAppointmentsLength: availableAppointments.length,
                filteredAvailableLength: filteredAvailableAppointments.length,
                searchQuery,
                willShowCards: !isAppointmentsLoading && filteredAvailableAppointments.length > 0
              });
              return null;
            })()}
            {isAppointmentsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : filteredAvailableAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-16 w-16 mb-4 text-white/70" />
                <h3 className="text-xl font-medium mb-2">
                  {searchQuery ? 'No Appointments Found' : 'No Available Appointments'}
                </h3>
                <p className="text-white/70">
                  {searchQuery 
                    ? `No appointments match "${searchQuery}". Try a different search term.`
                    : 'There are no pending appointments at this time. Check back later for new requests.'
                  }
                </p>
                {searchQuery && (
                  <button 
                    onClick={clearSearch}
                    className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                {!searchQuery && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                {(() => {
                  console.log('🎯 RENDERING AVAILABLE APPOINTMENT CARDS:', availableAppointments.length);
                  return null;
                })()}
                {/* Navigation buttons for multiple appointments */}
                {filteredAvailableAppointments.length > 1 && (
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
                {filteredAvailableAppointments[currentAvailableIndex] && (
                  <div className="bg-white/10 rounded-lg p-6">
                    {/* Editing Protection Warning */}
                    {filteredAvailableAppointments[currentAvailableIndex].is_being_edited && (
                      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⚠️</span>
                          <span className="text-sm font-medium">Customer is currently editing this appointment</span>
                        </div>
                      </div>
                    )}

                    {/* Edited After Quotes Warning */}
                    {filteredAvailableAppointments[currentAvailableIndex].edited_after_quotes && (
                      <div className="bg-amber-100 border border-amber-400 text-amber-700 px-3 py-2 rounded mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔄</span>
                          <div>
                            <div className="font-semibold">Appointment Updated</div>
                            <div className="text-sm">Customer modified details. Previous quotes removed.</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recently Updated Badge */}
                    {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && 
                     new Date().getTime() - new Date(filteredAvailableAppointments[currentAvailableIndex].last_edited_at).getTime() < 3600000 && (
                      <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded mb-4 inline-block">
                        Recently Updated
                      </div>
                    )}

                    {/* Location and Date */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <GoogleMapsLink 
                          address={filteredAvailableAppointments[currentAvailableIndex].location}
                          latitude={filteredAvailableAppointments[currentAvailableIndex].latitude}
                          longitude={filteredAvailableAppointments[currentAvailableIndex].longitude}
                          variant="dark"
                        />
                        </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{formatDate(filteredAvailableAppointments[currentAvailableIndex].appointment_date)}</span>
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="mb-6">
                      <div className="flex flex-col gap-2">
                        {/* Year, Make, Model Row */}
                        <div className="flex items-center gap-2 text-white">
                          {(() => {
                            const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                            console.log('🎯 Rendering vehicle info for appointment:', {
                              appointmentId: filteredAvailableAppointments[currentAvailableIndex]?.id,
                              hasVehicle: !!vehicle,
                              vehicleData: vehicle
                            });
                            
                            if (!vehicle) {
                              return <span className="text-white/70">Vehicle information not available</span>;
                            }
                            
                            const hasBasicInfo = vehicle.year || vehicle.make || vehicle.model;
                            if (!hasBasicInfo) {
                              return <span className="text-white/70">No vehicle details available</span>;
                            }
                            
                            return (
                              <>
                                {vehicle.year && <span className="font-medium">{vehicle.year}</span>}
                                {vehicle.make && <span className="font-medium">{vehicle.make}</span>}
                                {vehicle.model && <span className="font-medium">{vehicle.model}</span>}
                              </>
                            );
                          })()}
                    </div>
                        {/* VIN and Mileage Row */}
                        <div className="flex items-center gap-4 text-white/70 text-sm">
                          {(() => {
                            const vehicle = filteredAvailableAppointments[currentAvailableIndex]?.vehicles;
                            if (!vehicle) return null;
                            
                            const hasDetails = vehicle.vin || vehicle.mileage;
                            if (!hasDetails) return null;
                            
                            return (
                              <>
                                {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                                {vehicle.mileage && (
                                  <span>{vehicle.mileage.toLocaleString()} miles</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      </div>

                    {/* Selected Services - AVAILABLE APPOINTMENTS (around line 2626) */}
                    <div className="flex justify-between items-start mb-6">
                      {/* Selected Services */}
                      {filteredAvailableAppointments[currentAvailableIndex].selected_services && (
                        <div className="flex-1">
                          <h4 className="text-sm font-medium mb-2">Selected Services</h4>
                          <div className="flex flex-col gap-2">
                            {(filteredAvailableAppointments[currentAvailableIndex].selected_services && 
                              filteredAvailableAppointments[currentAvailableIndex].selected_services.length > 0) ? (
                              filteredAvailableAppointments[currentAvailableIndex].selected_services.map((service: string, index: number) => (
                                <span
                                  key={index}
                                  className="bg-white/20 text-xs px-3 py-1 rounded-full w-fit"
                                >
                                  {service}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-white/50 italic">None Selected</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Car Status */}
                      {filteredAvailableAppointments[currentAvailableIndex].car_runs !== null && (
                        <div className="flex-1 text-right">
                          <h4 className="text-sm font-medium mb-2">Car Status</h4>
                          <div className="flex items-center justify-end gap-1">
                            <div className={`w-3 h-3 rounded-full ${filteredAvailableAppointments[currentAvailableIndex].car_runs ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-sm">
                              {filteredAvailableAppointments[currentAvailableIndex].car_runs
                                ? "Car is running"
                                : "Car is not running"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Car Issues Section */}
                    {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues && filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.length > 0 ? (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Car Issues</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {filteredAvailableAppointments[currentAvailableIndex].selected_car_issues.map((issue: string, index: number) => (
                            <span
                              key={index}
                              className="bg-orange-200/30 text-orange-100 text-xs px-3 py-1 rounded-full text-center"
                            >
                              {formatCarIssue(issue)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Car Issues</h4>
                        <p className="text-sm text-white/50 italic">No car issues selected</p>
                      </div>
                    )}

                    {/* Issue Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Issue Description</h4>
                      <p className="text-sm text-white/70 bg-white/5 p-3 rounded-md">
                        {availableAppointments[currentAvailableIndex].issue_description || "No description provided"}
                      </p>
                    </div>

                    {/* Edit Timestamp */}
                    {filteredAvailableAppointments[currentAvailableIndex].last_edited_at && (
                      <div className="mb-6">
                        <div className="text-xs text-white/50 text-center">
                          Edited {formatRelativeTime(filteredAvailableAppointments[currentAvailableIndex].last_edited_at)}
                        </div>
                      </div>
                    )}

                    {/* Quote Input */}
                    <div className="mb-6">
                      <label htmlFor="price" className="block text-sm font-medium mb-2">
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
                            {getTimeSlots(selectedDate).map((slot) => (
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
                      {/* Check if customer has completed booking (has phone number) */}
                      {(() => {
                        const currentAppointment = availableAppointments[currentAvailableIndex];
                        const hasCompletedBooking = currentAppointment?.phone_number && 
                          (currentAppointment?.issue_description || 
                           (currentAppointment?.selected_services && currentAppointment.selected_services.length > 0));
                        
                        // Check if appointment is being edited
                        const isBeingEdited = currentAppointment?.is_being_edited;
                        const isQuotable = !isBeingEdited;
                        
                        if (!hasCompletedBooking) {
                          return (
                            <button
                              disabled={true}
                              className="flex-1 bg-gray-300 text-gray-500 font-medium text-lg py-2 px-4 rounded-full cursor-not-allowed"
                              title="Cannot quote - customer hasn't completed booking details yet"
                            >
                              <div className="flex items-center justify-center">
                                <span className="mr-2">⏳</span>
                                Cannot Quote Yet
                              </div>
                            </button>
                          );
                        }
                        
                        if (!isQuotable) {
                          return (
                            <button
                              disabled={true}
                              className="flex-1 bg-gray-300 text-gray-500 font-medium text-lg py-2 px-4 rounded-full cursor-not-allowed"
                              title="Cannot quote - customer is currently editing this appointment"
                            >
                              <div className="flex items-center justify-center">
                                <span className="mr-2">⚠️</span>
                                Appointment Being Edited
                              </div>
                            </button>
                          );
                        }
                        
                        return (
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
                              "Send"
                            )}
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => handleSkipAppointment(availableAppointments[currentAvailableIndex].id)}
                        disabled={isProcessing}
                        className="border border-white text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        Skip
                      </button>
                    </div>

                    {/* Pagination Dots */}
                    {availableAppointments.length > 1 && (
                      <div className="flex justify-center mt-4 gap-1">
                        {availableAppointments.map((_, index: number) => (
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

        {/* Empty State for No Appointments */}
        {!isAppointmentsLoading && 
         availableAppointments.length === 0 && 
         upcomingAppointments.length === 0 && 
         skippedAppointments.length === 0 && (
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
                        {getTimeSlots(editDate).map((slot) => (
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

      {/* Schedule Cancel Modal */}
      {showScheduleCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Who initiated the cancellation?</h3>
            
            <div className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cancellationType"
                      value="customer"
                      checked={cancellationType === 'customer'}
                      onChange={(e) => setCancellationType(e.target.value as 'customer' | 'mechanic')}
                      className="mr-2"
                    />
                    Customer Reasons
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cancellationType"
                      value="mechanic"
                      checked={cancellationType === 'mechanic'}
                      onChange={(e) => setCancellationType(e.target.value as 'customer' | 'mechanic')}
                      className="mr-2"
                    />
                    Mechanic Reasons
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                  required
                >
                  <option value="">Select a reason</option>
                  {cancellationType === 'customer' ? (
                    <>
                      <option value="customer_cancelled">Customer cancelled</option>
                      <option value="customer_no_answer">Customer did not answer</option>
                    </>
                  ) : (
                    <>
                      <option value="mechanic_no_show">I did not show up</option>
                      <option value="mechanic_incomplete">I did not complete the work</option>
                      <option value="mechanic_decided">I decided to cancel</option>
                    </>
                  )}
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">
                  {cancellationType === 'customer' 
                    ? "Customer will receive a full refund. A cancellation fee will be charged to the customer."
                    : "Customer will receive a full refund. You will be charged a cancellation fee."
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleScheduleCancelSubmit}
                disabled={!cancellationReason}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
              <button
                onClick={() => {
                  setShowScheduleCancelModal(false);
                  setCancellationReason('');
                  setCancellationType('customer');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Edit Modal */}
      {showScheduleEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Appointment</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleScheduleEditSubmit(); }}>
              {/* Price Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
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
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
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
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                      required
                    >
                      <option value="">Choose a time</option>
                      {getTimeSlots(selectedDate).map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!priceInput || !selectedDate || !selectedTime}
                  className="flex-1 bg-[#294a46] text-white font-medium py-2 px-4 rounded-md hover:bg-[#1e3632] transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleEditModal(false);
                    setPriceInput('');
                    setSelectedDate(getDefaultDate());
                    setSelectedTime(getDefaultTime());
                    setNotes('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refer a Friend Modal */}
      <Dialog open={showReferModal} onOpenChange={setShowReferModal}>
        <DialogContent className="sm:max-w-md" aria-describedby="refer-dialog-description">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              Refer a Friend
            </DialogTitle>
            <DialogDescription id="refer-dialog-description" className="text-center text-gray-600">
              Thank you for helping us grow! Share the link below with your friends.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={window.location.origin}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
                placeholder="Landing page URL"
              />
              <button
                onClick={copyLinkToClipboard}
                className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                  isLinkCopied 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-[#294a46] text-white hover:bg-[#1e3632]'
                }`}
              >
                {isLinkCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <span className="text-sm">📋</span>
                    Copy Link
                  </>
                )}
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                When your friends sign up using this link, you'll both benefit from our referral program!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
