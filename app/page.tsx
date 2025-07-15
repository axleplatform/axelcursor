// @ts-nocheck
"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react'
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, User, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { DateTimeSelector } from "@/components/date-time-selector"
import { toast } from "@/components/ui/use-toast"
import HomepageLocationInput from "@/components/homepage-location-input"


// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Global type declarations
declare global {
  interface Window {
    initMap?: () => void;
    mapInstance?: google.maps.Map;
  }
}

// Define types for form data
interface AppointmentFormData {
  location: string
  vin: string
  year: string
  make: string
  model: string
  mileage: string
  appointmentDate: string
  appointmentTime: string
  issueDescription?: string
  selectedServices?: string[]
  carRuns?: boolean
  latitude?: number
  longitude?: number
  place_id?: string
  phone?: string
  email?: string | null | undefined
}

// Define the update data type
interface AppointmentUpdateData {
  updated_at: string;
  is_being_edited: boolean;
  edited_after_quotes?: boolean;
  latitude?: number;
  longitude?: number;
  place_id?: string | null;
  user_id: string;
  status: string;
  appointment_date: string;
  location: string;
  issue_description?: string;
  selected_services?: string[];
  car_runs?: boolean;
  source: string;
}

interface SupabaseQueryResult {
  data: unknown
  error: unknown
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function HomePageContent(): React.JSX.Element {
  // IMPORTANT: Function declaration order matters to prevent temporal dead zone
  // Do not move functions above their dependencies
  // Order: useState/useRef -> Functions (in dependency order) -> useEffects -> JSX

  // 1. ALL useState and useRef declarations first
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isLoadingExistingData, setIsLoadingExistingData] = useState<boolean>(false)
  const [errors, setErrors] = useState<Partial<AppointmentFormData & { general?: string }>>({})
  const [formData, setFormData] = useState<AppointmentFormData>({
    location: "",
    vin: "",
    year: "",
    make: "",
    model: "",
    mileage: "",
    appointmentDate: "",
    appointmentTime: "",
  })

  // State for highlighting missing fields when Continue button is disabled
  const [showMissingFields, setShowMissingFields] = useState<boolean>(false)

  // Add refs for progressive navigation
  const modelRef = useRef<HTMLInputElement>(null)
  const vinRef = useRef<HTMLInputElement>(null)
  const mileageRef = useRef<HTMLInputElement>(null)
  const dateTimeSelectorRef = useRef<{ openDateDropdown: () => void; openTimeDropdown: () => void; isFormComplete: () => boolean } | null>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  // Get appointment ID from URL parameters for restoring state
  const appointmentId = searchParams?.get("appointment_id") || null

  // Add selectedLocation state
  const [selectedLocation, setSelectedLocation] = useState<google.maps.places.PlaceResult | null>(null)

  // Add map state and refs
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768

  // 2. ALL function definitions in dependency order
  // Functions with no dependencies first
  const showCoordinates = useCallback((lat: number, lng: number) => {
    return `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, []);

  const animateToLocation = useCallback((map: google.maps.Map, location: { lat: number; lng: number }) => {
    // Start at zoom 15
    map.setZoom(15);
    map.panTo(location);
    
    // Smooth zoom with smaller increments
    let currentZoom = 15;
    const targetZoom = 18;
    const zoomIncrement = 0.1; // Much smaller increment for smoothness
    const animationSpeed = 50; // Faster interval (ms)
    
    const smoothZoom = setInterval(() => {
      currentZoom += zoomIncrement;
      map.setZoom(currentZoom);
      
      if (currentZoom >= targetZoom) {
        map.setZoom(targetZoom); // Ensure exact final zoom
        clearInterval(smoothZoom);
      }
    }, animationSpeed);
    
    // Total animation time: ~600ms (very fast and smooth)
  }, []);

  // Functions that depend on others (in dependency order)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const { reverseGeocode: reverseGeocodeFunc } = await import('@/lib/google-maps');
      const results = await reverseGeocodeFunc(lat, lng);
      return results && results[0] ? results[0].formatted_address : showCoordinates(lat, lng);
    } catch (error) {
      console.warn('Reverse geocoding failed, showing coordinates:', error);
      return showCoordinates(lat, lng);
    }
  }, [showCoordinates]);

  const createDraggableMarker = useCallback((map: google.maps.Map, location: { lat: number; lng: number }, onDragEnd: (newPos: { lat: number; lng: number }) => void) => {
    try {
      // Validate inputs
      if (!map || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        console.error('Invalid inputs for marker creation:', { map, location });
        return null;
      }
      
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: location,
        map: map,
        gmpDraggable: true,
        title: "Drag to adjust location"
      });
      
      // Verify marker was created
      if (!marker) {
        console.error('Failed to create marker');
        return null;
      }
    
      // Add cursor style for visual feedback
      if (marker.content) {
        marker.content.style.cursor = 'grab';
      }
      
      // Change cursor while dragging
      marker.addListener('dragstart', () => {
        if (marker.content) {
          marker.content.style.cursor = 'grabbing';
        }
      });
      
      // Add drag end event listener
      marker.addListener('dragend', async (event: any) => {
        // Reset cursor
        if (marker.content) {
          marker.content.style.cursor = 'grab';
        }
        
        // For AdvancedMarkerElement, position is directly on the marker
        const position = marker.position;
        
        // Check if position exists and has proper format
        if (!position) {
          console.error('No position available on marker');
          return;
        }
        
        // Handle different position formats for AdvancedMarkerElement
        let lat, lng;
        
        // Handle different position formats
        if (typeof position.lat === 'function') {
          lat = position.lat();
          lng = position.lng();
        } else if (position.lat !== undefined && position.lng !== undefined) {
          lat = position.lat;
          lng = position.lng;
        } else {
          console.error('Invalid position format:', position);
          return;
        }
        
        // Validate coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
          console.error('Invalid coordinates from marker position:', { lat, lng });
          return;
        }
        
        console.log('New position:', { lat, lng });
        
        // Get address from reverse geocoding
        const address = await reverseGeocode(lat, lng);
        
        onDragEnd({ lat, lng, address });
      });
      
      return marker;
    } catch (error) {
      console.error('Error creating marker:', error);
      return null;
    }
  }, [reverseGeocode]);

  const updateMapLocation = useCallback((location: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;
    
    // Remove old marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    
    // Animate to new location
    animateToLocation(mapInstanceRef.current, location);
    
    // Add draggable marker
    const newMarker = createDraggableMarker(mapInstanceRef.current, location, (newPos) => {
      // Update form with new coordinates and address
      setFormData(prev => ({
        ...prev,
        latitude: newPos.lat,
        longitude: newPos.lng,
        location: newPos.address || `${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}` // Use address if available, otherwise coordinates
      }));

      // Update selectedLocation if it exists - use setSelectedLocation directly
      setSelectedLocation(prevSelectedLocation => {
        if (prevSelectedLocation) {
          return {
            ...prevSelectedLocation,
            geometry: {
              ...prevSelectedLocation.geometry,
              location: { lat: newPos.lat, lng: newPos.lng }
            },
            formatted_address: newPos.address || `${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`
          };
        }
        return prevSelectedLocation;
      });
    });
    
    // Only set marker ref if creation was successful
    if (newMarker) {
      markerRef.current = newMarker;
    } else {
      console.error('Failed to create draggable marker');
    }
  }, [animateToLocation, createDraggableMarker]);

  // Initialize map on mount
  const initializeMap = useCallback(async () => {
    try {
      console.log('🔍 Map init: Starting initialization...');
      
      if (!mapRef.current) {
        console.log('🔍 Map init: Map ref not ready, retrying...');
        return;
      }

      // Always clean up existing map instance first
      if (mapInstanceRef.current) {
        console.log('🔍 Map init: Cleaning up existing map instance');
        mapInstanceRef.current = null;
      }

      // Check if map container element exists before initializing
      const mapElement = mapRef.current;
      if (!mapElement) {
        console.log('🔍 Map init: Map container element not found');
        return;
      }

      console.log('🔍 Map init: Cleaning up existing elements...');
      // Clean up any existing Google Maps elements that might interfere
      const pacElements = document.querySelectorAll('.pac-container, .pac-item');
      pacElements.forEach(el => {
        try {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (error) {
          console.log('🔍 Map init: Cleanup error (ignored):', error);
        }
      });

      console.log('🔍 Map init: Loading Google Maps...');
      // Load Google Maps using the safe loader
      const { loadGoogleMaps } = await import('@/lib/google-maps');
      const google = await loadGoogleMaps();

      // Check if we have saved location data from appointment or form
      const hasSavedLocation = formData.latitude && formData.longitude && formData.location;
      const initialCenter = hasSavedLocation 
        ? { lat: formData.latitude, lng: formData.longitude }
        : { lat: 40.7128, lng: -74.0060 }; // NYC default
      
      const initialZoom = hasSavedLocation ? 18 : 12;

      console.log('🔍 Map init: Creating map instance...');
      console.log('🔍 Map init: Initial center:', initialCenter);
      console.log('🔍 Map init: Has saved location:', hasSavedLocation);
      
      const map = new google.maps.Map(mapElement, {
        center: initialCenter,
        zoom: initialZoom,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
      });
      
      mapInstanceRef.current = map;
      setMapLoaded(true);
      console.log('✅ Map initialized successfully');

      // If we have saved location data, add the marker and restore the exact position
      if (hasSavedLocation) {
        console.log('🔍 Map init: Restoring saved location with marker');
        
        // We'll handle marker creation in a separate effect to avoid circular dependencies
        // The marker will be created by the updateMapLocation function when it's available
      }
    } catch (error) {
      console.error('❌ Map initialization error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
    }
  }, [formData.latitude, formData.longitude, formData.location]);

  // Utility functions (no dependencies on other functions)
  const scrollToElement = useCallback((element: HTMLElement | null, offset = 100) => {
    if (!element || !isMobile) return

    const elementRect = element.getBoundingClientRect()
    const absoluteElementTop = elementRect.top + window.pageYOffset
    const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2) - offset

    window.scrollTo({
      top: Math.max(0, middle),
      behavior: 'smooth'
    })
  }, [isMobile])

  const scrollToLocationSection = useCallback(() => {
    if (!isMobile) return
    
    // Find the location label
    const locationLabel = document.querySelector('label')
    if (locationLabel) {
      scrollToElement(locationLabel as HTMLElement, 50)
    }
  }, [isMobile, scrollToElement])

  const scrollToFormSection = useCallback((fieldName: string) => {
    if (!isMobile) return
    
    const field = document.querySelector(`[name="${fieldName}"]`) as HTMLElement
    if (field) {
      scrollToElement(field, 100)
    }
  }, [isMobile, scrollToElement])

  // Data loading functions
  const loadDataFromStorage = useCallback(() => {
    const savedFormData = sessionStorage.getItem('axle-landing-form-data')
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData)
        console.log("🔄 Restoring form data from sessionStorage:", parsedData)
        setFormData(prev => ({ ...prev, ...parsedData }))
        toast({
          title: "Form Restored",
          description: "Your previous information has been restored.",
        })
      } catch (error) {
        console.error("Error parsing saved form data:", error)
      }
    }
  }, []);

  const saveFormDataToStorage = useCallback(() => {
    if (formData.location || formData.year || formData.make || formData.model) {
      sessionStorage.setItem('axle-landing-form-data', JSON.stringify(formData))
    }
  }, [formData]);

  const loadPhoneEmailFromStorage = useCallback(() => {
    if (appointmentId && !formData.phone) {
      const savedPhone = sessionStorage.getItem('customer_phone');
      const savedEmail = sessionStorage.getItem('customer_email');
      if (savedPhone) {
        setFormData(prev => ({ 
          ...prev, 
          phone: savedPhone,
          email: savedEmail || undefined
        }));
      }
    }
  }, [appointmentId, formData.phone]);

  const loadExistingAppointment = useCallback(async () => {
    if (!appointmentId) return;

    setIsLoadingExistingData(true)
    try {
      console.log("🔄 Loading existing appointment data for:", appointmentId)
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          vehicles!fk_appointment_id(*)
        `)
        .eq("id", appointmentId)
        .single()

      if (error) {
        console.error("Error loading appointment:", error)
        return;
      }

      if (data) {
        console.log("✅ Loaded appointment data:", data)
        console.log("📍 Appointment location data:", {
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          place_id: data.place_id
        })
        
        // Restore form data from existing appointment
        setFormData(prev => ({
          ...prev,
          location: data.location || "",
          vin: data.vehicles?.vin || "",
          year: data.vehicles?.year?.toString() || "",
          make: data.vehicles?.make || "",
          model: data.vehicles?.model || "",
          mileage: data.vehicles?.mileage?.toString() || "",
          appointmentDate: data.appointment_date ? data.appointment_date.split('T')[0] : "",
          appointmentTime: data.appointment_date ? data.appointment_date.split('T')[1]?.substring(0, 5) : "",
          issueDescription: data.issue_description || "",
          selectedServices: data.selected_services || [],
          carRuns: data.car_runs,
          latitude: data.latitude,
          longitude: data.longitude,
          place_id: data.place_id
        }))

        // If we have location data, trigger map reinitialization
        if (data.latitude && data.longitude && data.location) {
          console.log("🗺️ Appointment has location data - will trigger map restoration");
        }

        toast({
          title: "Form Restored",
          description: "Your previous information has been loaded.",
        })
      }
    } catch (error) {
      console.error("Error loading appointment data:", error)
    } finally {
      setIsLoadingExistingData(false)
    }
  }, [appointmentId])

  // Form handling functions
  const handleChange = React.useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData((prev: AppointmentFormData) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name as keyof AppointmentFormData]) {
      setErrors((prev: typeof errors) => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      
      const currentField = e.currentTarget.name
      
      switch (currentField) {
        case 'model':
          vinRef.current?.focus()
          break
        case 'vin':
          mileageRef.current?.focus()
          break
        case 'mileage':
          // Open date dropdown
          if (dateTimeSelectorRef.current?.openDateDropdown) {
            dateTimeSelectorRef.current.openDateDropdown()
          }
          break
        default:
          break
      }
    }
  }, [])

  const validateForm = React.useCallback((): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Ensure location is a string before calling trim
    const location = typeof formData.location === 'string' ? formData.location : String(formData.location || '');
    if (!location.trim()) {
      newErrors.location = "Location is required"
    }

    if (!formData.year.trim()) {
      newErrors.year = "Year is required"
    }

    if (!formData.make.trim()) {
      newErrors.make = "Make is required"
    }

    if (!formData.model.trim()) {
      newErrors.model = "Model is required"
    }

    if (!formData.appointmentDate.trim()) {
      newErrors.appointmentDate = "Date is required"
    }

    if (!formData.appointmentTime.trim()) {
      newErrors.appointmentTime = "Time is required"
    }

    // Validate appointment date: FUTURE DATES are always valid, only check time for TODAY
    if (formData.appointmentDate && formData.appointmentTime) {
      try {
        // Parse appointment date using local timezone to avoid UTC issues
        // Split the date string and create Date with explicit local timezone
        const [year, month, day] = formData.appointmentDate.split('-').map(Number)
        const appointmentDate = new Date(year, month - 1, day) // month is 0-indexed
        
        // Create today's date properly 
        const realToday = new Date() // Get actual current date/time
        const today = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate()) // Today at midnight
        
        console.log('🔍 DEBUG: Raw appointment date string:', formData.appointmentDate)
        console.log('🔍 DEBUG: Parsed appointment [year, month, day]:', [year, month, day])
        console.log('🔍 DEBUG: appointmentDate object:', appointmentDate)
        console.log('🔍 DEBUG: appointmentDate.getTime():', appointmentDate.getTime())
        console.log('🔍 DEBUG: realToday object:', realToday)
        console.log('🔍 DEBUG: today object (midnight):', today)
        console.log('🔍 DEBUG: appointmentDate < today:', appointmentDate < today)
        
        // Only validate time if appointment is today
        if (appointmentDate < today) {
          newErrors.appointmentDate = "Appointment date must be today or in the future"
        } else if (appointmentDate.getTime() === today.getTime()) {
          // Appointment is today, validate time
          const [hours, minutes] = formData.appointmentTime.split(':').map(Number)
          const appointmentTime = new Date(year, month - 1, day, hours, minutes)
          const now = new Date()
          
          console.log('🔍 DEBUG: Appointment time:', appointmentTime)
          console.log('🔍 DEBUG: Current time:', now)
          console.log('🔍 DEBUG: Time difference (minutes):', (appointmentTime.getTime() - now.getTime()) / (1000 * 60))
          
          // Allow appointments at least 30 minutes in the future
          const minTimeDiff = 30 * 60 * 1000 // 30 minutes in milliseconds
          if (appointmentTime.getTime() - now.getTime() < minTimeDiff) {
            newErrors.appointmentTime = "Appointment time must be at least 30 minutes in the future"
          }
        }
      } catch (error) {
        console.error('Error validating appointment date/time:', error)
        newErrors.appointmentDate = "Invalid appointment date/time"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Location handling functions
  const handleLocationSelect = useCallback((place: google.maps.places.PlaceResult) => {
    // Add null checks and validation
    if (!place || !place.geometry) {
      console.error('Invalid place data received:', place);
      return;
    }

    if (typeof place.geometry.location.lat !== 'number' || typeof place.geometry.location.lng !== 'number') {
      console.error('Invalid coordinates received:', place.geometry.location);
      return;
    }

    setSelectedLocation(place);
    setFormData((prev) => ({
      ...prev,
      location: place.formatted_address || "",
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      place_id: place.place_id || '',
    }));

    // Update map with new location
    const coordinates = {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    };
    updateMapLocation(coordinates);

    // Scroll to location section on mobile after a short delay
    setTimeout(() => {
      scrollToLocationSection();
    }, 300);
  }, [updateMapLocation, scrollToLocationSection]);

  const handleLocationChange = useCallback((val: string | React.ChangeEvent<HTMLInputElement>) => {
    const value = typeof val === 'string' ? val : val.target.value;
    setFormData(f => ({ ...f, location: value }));
    // No automatic geocoding - only update when user selects from dropdown
  }, []);

  const handleMarkerDragEnd = useCallback((event: any) => {
    // For AdvancedMarkerElement, position is directly on the marker
    const marker = event.target;
    const position = marker?.position;
    
    // Check if position exists and has proper format
    if (!position) {
      console.error('No position available on marker');
      return;
    }
    
    // Handle different position formats for AdvancedMarkerElement
    let lat, lng;
    
    // Handle different position formats
    if (typeof position.lat === 'function') {
      lat = position.lat();
      lng = position.lng();
    } else if (position.lat !== undefined && position.lng !== undefined) {
      lat = position.lat;
      lng = position.lng;
    } else {
      console.error('Invalid position format:', position);
      return;
    }
    
    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates from marker position:', { lat, lng });
      return;
    }

    // Update the coordinates
    console.log('New position:', { lat, lng });
    
    // Update form data with new coordinates
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: `${lat.toFixed(6)}, ${lng.toFixed(6)}` // Show coordinates
    }));

    // Update selectedLocation if it exists
    if (selectedLocation) {
      // Create a new location object with updated coordinates
      const updatedLocation = {
        ...selectedLocation,
        geometry: {
          ...selectedLocation.geometry,
          location: { lat, lng }
        },
        formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      };
      setSelectedLocation(updatedLocation);
    }
  }, [selectedLocation]);

  // Memoized computed values
  const isFormComplete = React.useMemo((): boolean => {
    return !!(
      formData.location?.trim() &&
      formData.year?.trim() &&
      formData.make?.trim() &&
      formData.model?.trim() &&
      formData.appointmentDate?.trim() &&
      formData.appointmentTime?.trim()
    )
  }, [formData.location, formData.year, formData.make, formData.model, formData.appointmentDate, formData.appointmentTime])

  const missingFields = React.useMemo((): string[] => {
    const fields: string[] = []
    
    if (!formData.location?.trim()) fields.push('location')
    if (!formData.year?.trim()) fields.push('year')
    if (!formData.make?.trim()) fields.push('make')
    if (!formData.model?.trim()) fields.push('model')
    if (!formData.appointmentDate?.trim()) fields.push('appointmentDate')
    if (!formData.appointmentTime?.trim()) fields.push('appointmentTime')
    
    return fields
  }, [formData.location, formData.year, formData.make, formData.model, formData.appointmentDate, formData.appointmentTime])

  // Form submission function
  const handleSubmit = React.useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      console.log('🚀 Starting appointment creation...')
      console.log('📋 Form data:', formData)

      // Create temporary user if needed
      const userId = await createTemporaryUser()

      // Prepare appointment data
      const appointmentData = {
        user_id: userId,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        place_id: formData.place_id,
        appointment_date: `${formData.appointmentDate}T${formData.appointmentTime}:00`,
        issue_description: formData.issueDescription || '',
        selected_services: formData.selectedServices || [],
        car_runs: formData.carRuns,
        source: 'landing_page',
        status: 'pending'
      }

      console.log('📝 Appointment data prepared:', appointmentData)

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()

      if (appointmentError) {
        console.error('❌ Error creating appointment:', appointmentError)
        throw appointmentError
      }

      console.log('✅ Appointment created:', appointment)

      // Create vehicle record
      const vehicleData = {
        appointment_id: appointment.id,
        year: parseInt(formData.year),
        make: formData.make,
        model: formData.model,
        vin: formData.vin || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null
      }

      console.log('🚗 Vehicle data prepared:', vehicleData)

      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert([vehicleData])

      if (vehicleError) {
        console.error('❌ Error creating vehicle:', vehicleError)
        throw vehicleError
      }

      console.log('✅ Vehicle created successfully')

      // Save phone and email to session storage for future use
      if (formData.phone) {
        sessionStorage.setItem('customer_phone', formData.phone)
      }
      if (formData.email) {
        sessionStorage.setItem('customer_email', formData.email)
      }

      // Clear form data from session storage
      sessionStorage.removeItem('axle-landing-form-data')

      // Navigate to book appointment page
      const searchParams = new URLSearchParams()
      searchParams.set('appointment_id', appointment.id)
      
      console.log('🎯 Navigating to book appointment page...')
      router.push(`/book-appointment?${searchParams.toString()}`)

    } catch (error) {
      console.error('❌ Error in form submission:', error)
      setErrors({ general: 'An error occurred while creating your appointment. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm, createTemporaryUser, router])

  // Utility functions for user creation
  const createTemporaryUser = async () => {
    try {
      // Check if user already exists in session storage
      const existingUserId = sessionStorage.getItem('temp_user_id')
      if (existingUserId) {
        console.log('👤 Using existing user ID:', existingUserId)
        return existingUserId
      }

      console.log('👤 Creating temporary user...')
      
      // Create anonymous user
      const { data: { user }, error } = await supabase.auth.signUp({
        email: `temp_${Date.now()}@axle.temp`,
        password: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      })

      if (error) {
        console.error('❌ Error creating temporary user:', error)
        throw error
      }

      if (!user) {
        throw new Error('No user returned from signup')
      }

      console.log('✅ Temporary user created:', user.id)
      
      // Store user ID in session storage
      sessionStorage.setItem('temp_user_id', user.id)
      
      return user.id
    } catch (error) {
      console.error('❌ Error in createTemporaryUser:', error)
      throw error
    }
  }

  const handleEditFromLanding = async (appointmentId: string, updates: any) => {
    try {
      console.log('🔄 Updating appointment from landing page:', appointmentId, updates)
      
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)

      if (error) {
        console.error('❌ Error updating appointment:', error)
        throw error
      }

      console.log('✅ Appointment updated successfully')
      
      // Navigate to book appointment page
      const searchParams = new URLSearchParams()
      searchParams.set('appointment_id', appointmentId)
      router.push(`/book-appointment?${searchParams.toString()}`)

    } catch (error) {
      console.error('❌ Error in handleEditFromLanding:', error)
      setErrors({ general: 'An error occurred while updating your appointment. Please try again.' })
    }
  }

  // Common car makes for the dropdown
  const makes = [
    "Acura",
    "Audi",
    "BMW",
    "Buick",
    "Cadillac",
    "Chevrolet",
    "Chrysler",
    "Dodge",
    "Ford",
    "GMC",
    "Honda",
    "Hyundai",
    "Infiniti",
    "Jaguar",
    "Jeep",
    "Kia",
    "Land Rover",
    "Lexus",
    "Lincoln",
    "Mazda",
    "Mercedes",
    "Mercury",
    "Mitsubishi",
    "Nissan",
    "Pontiac",
    "Porsche",
    "Ram",
    "Subaru",
    "Tesla",
    "Toyota",
    "Volkswagen",
    "Volvo",
  ]

  // 3. ALL useEffects last (after all functions they use are defined)
  useEffect(() => {
    if (appointmentId) {
      loadExistingAppointment()
    } else {
      loadDataFromStorage()
    }
  }, [appointmentId, loadExistingAppointment, loadDataFromStorage])

  useEffect(() => {
    saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  useEffect(() => {
    loadPhoneEmailFromStorage();
  }, [loadPhoneEmailFromStorage]);

  // Add debug logging
  useEffect(() => {
    // Test Supabase connection
    supabase.from('appointments').select('count').then(
      ({ data, error }: SupabaseQueryResult) => {
        if (error) {
          console.error("Supabase connection error:", error)
        } else {
          console.log("Supabase connection successful:", data)
        }
      }
    )
  }, [])

  // Debug: Log form field changes
  useEffect(() => {
    console.log('[DEBUG] formData:', formData);
  }, [formData]);

  // Simplified map initialization - always initialize when component is active
  useEffect(() => {
    console.log('🗺️ Landing page mounted/active - initializing map');
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapRef.current) {
        initializeMap();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [initializeMap]);

  // Reinitialize map when form data changes (e.g., when appointment data is loaded)
  useEffect(() => {
    if (mapLoaded && formData.latitude && formData.longitude && formData.location) {
      console.log('🗺️ Form data changed - reinitializing map with saved location');
      
      // Small delay to ensure form data is fully updated
      const timer = setTimeout(() => {
        if (mapRef.current) {
          initializeMap();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [formData.latitude, formData.longitude, formData.location, mapLoaded, initializeMap]);

  // Handle marker creation for saved locations after map is initialized
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && formData.latitude && formData.longitude && formData.location) {
      console.log('🗺️ Map loaded with saved location - creating marker');
      
      // Small delay to ensure all functions are available
      const timer = setTimeout(() => {
        if (mapInstanceRef.current && updateMapLocation) {
          const coordinates = { lat: formData.latitude, lng: formData.longitude };
          updateMapLocation(coordinates);
          console.log('✅ Saved location marker created');
        }
      }, 150);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [mapLoaded, formData.latitude, formData.longitude, formData.location, updateMapLocation]);

  // Handle visibility changes and focus events to reinitialize map
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mapRef.current && !mapInstanceRef.current) {
        console.log('🗺️ Page became visible - reinitializing map');
        setTimeout(() => initializeMap(), 100);
      }
    };

    const handleFocus = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        console.log('🗺️ Window gained focus - reinitializing map');
        setTimeout(() => initializeMap(), 100);
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (useful for browser back button)
    window.addEventListener('focus', handleFocus);
    
    // Also check if map needs initialization when component becomes active
    const checkMapInterval = setInterval(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        console.log('🗺️ Map check - reinitializing missing map');
        initializeMap();
      }
    }, 2000); // Check every 2 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(checkMapInterval);
    };
  }, [initializeMap]);

  // Force map reinitialization when navigating to landing page
  useEffect(() => {
    if (pathname === '/') {
      console.log('🗺️ Landing page route detected - ensuring map is initialized');
      
      // Force cleanup and reinitialization
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      
      // Reinitialize map after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ Route-based map reinitialization');
          initializeMap();
        }
      }, 100);
    }
  }, [pathname, initializeMap]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log('🗺️ Landing page unmounting - cleaning up map');
      // Cleanup map instance and marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Watch for existing appointment data and update map if needed
  useEffect(() => {
    // Only run if we're loading existing appointment data with coordinates
    const shouldAddMarker = formData.location && formData.latitude && formData.longitude && appointmentId;
    
    if (shouldAddMarker && mapInstanceRef.current) {
      const coordinates = { lat: formData.latitude, lng: formData.longitude };
      updateMapLocation(coordinates);
    }
  }, [formData.latitude, formData.longitude, appointmentId, updateMapLocation]);

  // Handle Continue button hover/click when disabled
  const handleDisabledContinueInteraction = React.useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      setShowMissingFields(true)
      
      // Simple red border for missing fields
      missingFields.forEach((fieldName) => {
        let targetElement: HTMLElement | null = null
        
        switch (fieldName) {
          case 'location':
            targetElement = document.querySelector('input[name="location"]')
            break
          case 'year':
            targetElement = document.querySelector('select[name="year"]')
            break
          case 'make':
            targetElement = document.querySelector('select[name="make"]')
            break
          case 'model':
            targetElement = document.querySelector('input[name="model"]')
            break
          case 'appointmentDate':
            targetElement = document.querySelector('input[type="date"]') || 
                           document.querySelector('[data-testid="date-selector"]')
            break
          case 'appointmentTime':
            targetElement = document.querySelector('.time-selector button') ||
                           document.querySelector('[data-testid="time-selector"]') ||
                           document.querySelector('select[aria-label*="time"]')
            break
        }
        
        if (targetElement) {
          targetElement.style.borderColor = '#ef4444'
        }
      })
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowMissingFields(false)
        // Remove red borders
        missingFields.forEach((fieldName) => {
          let targetElement: HTMLElement | null = null
          
          switch (fieldName) {
            case 'location':
              targetElement = document.querySelector('input[name="location"]')
              break
            case 'year':
              targetElement = document.querySelector('select[name="year"]')
              break
            case 'make':
              targetElement = document.querySelector('select[name="make"]')
              break
            case 'model':
              targetElement = document.querySelector('input[name="model"]')
              break
            case 'appointmentDate':
              targetElement = document.querySelector('input[type="date"]') || 
                             document.querySelector('[data-testid="date-selector"]')
              break
            case 'appointmentTime':
              targetElement = document.querySelector('.time-selector button') ||
                             document.querySelector('[data-testid="time-selector"]') ||
                             document.querySelector('select[aria-label*="time"]')
              break
          }
          
          if (targetElement) {
            targetElement.style.borderColor = ''
          }
        })
      }, 3000)
    }
  }, [isFormComplete, isSubmitting, missingFields])

  const handleDateTimeChange = React.useCallback((date: Date, time: string): void => {
    // This function is only called when BOTH date AND time are properly selected
    // (thanks to our DateTimeSelector improvement)
    
    // Convert the selected date and time to the format expected by the form
    const formattedDate = date.toISOString().split("T")[0]

    // Process the time selection
    let formattedTime: string = ""
    
    if (time && time !== "Select time" && time !== "") {
      if (time === "ASAP") {
        // Keep "ASAP" as the value for validation and processing
        formattedTime = "ASAP"
      } else {
        // Parse the time string (e.g., "9:30 AM") to 24-hour format
        const [timePart, ampm] = time.split(" ")
        let [hours, minutes] = timePart.split(":").map(Number)

        if (ampm === "PM" && hours < 12) hours += 12
        if (ampm === "AM" && hours === 12) hours = 0

        formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      }
    }

    // Update form data - this will NOT trigger form submission, only state update
    setFormData((prev: AppointmentFormData) => ({
      ...prev,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
    }))
  }, [])

  // Memoized event handlers to prevent infinite loops
  const handleTimeSelected = useCallback(() => {
    // After time is selected, focus the continue button
    setTimeout(() => {
      continueButtonRef.current?.focus()
    }, 100)
  }, []);

  const handleWrapperMouseEnter = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperMouseDown = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperClick = useCallback((e: React.MouseEvent) => {
    if (!isFormComplete && !isSubmitting) {
      e.preventDefault()
      e.stopPropagation()
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperTouchStart = useCallback(() => {
    if (!isFormComplete && !isSubmitting) {
      handleDisabledContinueInteraction()
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isFormComplete && !isSubmitting) {
        handleDisabledContinueInteraction()
      }
    }
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    if (!isFormComplete && !isSubmitting) {
      e.preventDefault();
      e.stopPropagation();
      handleDisabledContinueInteraction();
      console.log('[DEBUG] Continue button clicked - missingFields:', missingFields, 'formData:', formData);
    }
    console.log('🔘 Continue button onClick triggered - isSubmitting:', isSubmitting, 'isFormComplete:', isFormComplete);
  }, [isFormComplete, isSubmitting, handleDisabledContinueInteraction, missingFields, formData]);

  // Show loading state while restoring data
  if (isLoadingExistingData) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
            <p className="text-gray-600">Restoring your information...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <SiteHeader />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Title Section */}
          <h1 className="text-3xl font-bold text-center text-[#294a46] mb-2">Find Your Mechanic</h1>
          <div className="text-center mb-6">
            <p className="text-gray-600">Bring a Mechanic to your Location</p>
            <p className="text-gray-600">Order a Service</p>
            {appointmentId && (
              <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                ✨ Editing existing appointment
              </div>
            )}
          </div>

          <div className="mb-3 space-y-2">
            {/* Location Input */}
            <HomepageLocationInput
              value={formData.location}
              onChange={handleLocationChange}
              onLocationSelect={handleLocationSelect}
              label="Enter your location"
              required
            />



            {/* Map Container */}
            <div className="w-full h-[400px] rounded-lg border border-gray-200 overflow-hidden">
              <div ref={mapRef} className="w-full h-full bg-gray-100">
                {!mapLoaded && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Help text for dragging */}
            <p className="text-sm text-gray-600 mt-2">
              💡 Drag the Pin to Exact Location
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Car Selector */}
            <div className="mb-2 w-full">

              {/* Desktop layout: All fields in one row */}
              <div className="hidden sm:flex gap-2">
                <div className="relative w-[8ch]">

                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    onFocus={() => scrollToFormSection('year')}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.year 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Year</option>
                    {(() => {
                      const currentYear = new Date().getFullYear()
                      const currentMonth = new Date().getMonth() // 0-11, where 8 = September
                      const maxYear = currentMonth >= 8 ? currentYear + 2 : currentYear + 1 // Add extra year if September or later
                      const years = []
                      
                      for (let year = maxYear; year >= currentYear - 29; year--) {
                        years.push(year)
                      }
                      
                      return years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    })()}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.year && <p className="text-red-500 text-xs absolute -bottom-5">{errors.year}</p>}
                </div>

                <div className="relative w-[20%]">

                  <select
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    onFocus={() => scrollToFormSection('make')}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.make 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Make</option>
                    {makes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.make && <p className="text-red-500 text-xs absolute -bottom-5">{errors.make}</p>}
                </div>

                <div className="relative w-[20%]">

                  <input
                    ref={modelRef}
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Model"
                    className={`w-full h-[46px] px-2 text-sm border rounded-md bg-gray-50 transition-all duration-300 relative z-50 ${
                      errors.model 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                    onClick={() => console.log('🚗 Desktop Model input clicked')}
                    onFocus={() => {
                      console.log('🚗 Desktop Model input focused');
                      scrollToFormSection('model');
                    }}
                  />
                  {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
                </div>

                <div className="relative w-[30%]">
                  <input
                    ref={vinRef}
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="VIN (optional)"
                    onFocus={() => scrollToFormSection('vin')}
                    className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  />
                </div>

                <div className="relative w-[15%]">
                  <input
                    ref={mileageRef}
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Mileage"
                    onFocus={() => scrollToFormSection('mileage')}
                    className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              {/* Mobile layout: Two rows */}
              <div className="sm:hidden">
                {/* First row: Year, Make, Model */}
                <div className="flex gap-2 mb-2">
                  <div className="relative w-[8ch]">
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      onFocus={() => scrollToFormSection('year')}
                      className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                        errors.year 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">Year</option>
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const currentMonth = new Date().getMonth() // 0-11, where 8 = September
                        const maxYear = currentMonth >= 8 ? currentYear + 2 : currentYear + 1 // Add extra year if September or later
                        const years = []
                        
                        for (let year = maxYear; year >= currentYear - 29; year--) {
                          years.push(year)
                        }
                        
                        return years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))
                      })()}
                    </select>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.year && <p className="text-red-500 text-xs absolute -bottom-5">{errors.year}</p>}
                  </div>

                  <div className="relative flex-1">
                    <select
                      name="make"
                      value={formData.make}
                      onChange={handleChange}
                      onFocus={() => scrollToFormSection('make')}
                      className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                        errors.make 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">Make</option>
                      {makes.map((make) => (
                        <option key={make} value={make}>
                          {make}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.make && <p className="text-red-500 text-xs absolute -bottom-5">{errors.make}</p>}
                  </div>

                  <div className="relative flex-1">
                    <input
                      ref={modelRef}
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Model"
                      className={`w-full h-[46px] px-2 text-sm border rounded-md bg-gray-50 transition-all duration-300 relative z-50 ${
                        errors.model 
                          ? "border-red-500" 
                          : "border-gray-200"
                      }`}
                      onClick={() => console.log('🚗 Mobile Model input clicked')}
                      onFocus={() => {
                        console.log('🚗 Mobile Model input focused');
                        scrollToFormSection('model');
                      }}
                    />
                    {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
                  </div>
                </div>

                {/* Second row: VIN and Mileage */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={vinRef}
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="VIN (optional)"
                      onFocus={() => scrollToFormSection('vin')}
                      className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                    />
                  </div>

                  <div className="relative w-[120px]">
                    <input
                      ref={mileageRef}
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Mileage"
                      onFocus={() => scrollToFormSection('mileage')}
                      className="w-full h-[46px] px-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Time Selector */}
            <div className="mb-6 rounded-lg transition-all duration-300">
              <DateTimeSelector
                ref={dateTimeSelectorRef}
                onDateTimeChange={handleDateTimeChange}
                onTimeSelected={handleTimeSelected}
              />
            </div>

            {/* Continue Button */}
            <div className="flex justify-center mb-8">
              <div 
                className="relative inline-block"
                onMouseEnter={handleWrapperMouseEnter}
                onMouseDown={handleWrapperMouseDown}
                onClick={handleWrapperClick}
                onTouchStart={handleWrapperTouchStart}
                role="button"
                tabIndex={0}
                aria-label={!isFormComplete ? `Continue button wrapper - ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} missing` : "Continue to next step"}
                onKeyDown={handleWrapperKeyDown}
              >
                <Button
                  ref={continueButtonRef}
                  type="submit"
                  disabled={isSubmitting || !isFormComplete}
                  className={`font-medium py-6 px-10 rounded-full transform transition-all duration-200 relative focus:outline-none focus:ring-0 hover:outline-none active:outline-none ${
                    isFormComplete && !isSubmitting 
                      ? "bg-[#294a46] hover:bg-[#1e3632] text-white hover:scale-[1.01] active:scale-[0.99]" 
                      : "bg-[#294a46]/40 text-white cursor-pointer hover:bg-[#294a46]/60 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                  onClick={handleButtonClick}
                  // Enhanced accessibility attributes
                  aria-label={!isFormComplete ? `Continue button - ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} missing` : "Continue to next step"}
                  aria-describedby={!isFormComplete ? "missing-fields-help" : undefined}
                  aria-disabled={!isFormComplete || isSubmitting}
                  title={!isFormComplete ? `Complete ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} to continue` : "Continue to book your appointment"}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : !(typeof formData.location === 'string' ? formData.location : String(formData.location || '')).trim() ? (
                    <span>Please enter location</span>
                  ) : !(typeof formData.year === 'string' ? formData.year : String(formData.year || '')).trim() ? (
                    <span>Please select year</span>
                  ) : !(typeof formData.make === 'string' ? formData.make : String(formData.make || '')).trim() ? (
                    <span>Please select make</span>
                  ) : !(typeof formData.model === 'string' ? formData.model : String(formData.model || '')).trim() ? (
                    <span>Please enter model</span>
                  ) : !(typeof formData.appointmentDate === 'string' ? formData.appointmentDate : String(formData.appointmentDate || '')).trim() ? (
                    <span>Please select date</span>
                  ) : !(typeof formData.appointmentTime === 'string' ? formData.appointmentTime : String(formData.appointmentTime || '')).trim() ? (
                    <span>Please select a time</span>
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
                

              </div>
            </div>



            
            {/* Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
                <h3 className="text-sm font-semibold mb-1">Error</h3>
                <p className="text-sm">{errors.general}</p>
                {errors.general.includes('migration') && (
                  <div className="mt-2 text-xs text-red-600">
                    <p>Please run the database migration first:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to Supabase Dashboard → SQL Editor</li>
                      <li>Run migrations/implement_always_create_user_system.sql</li>
                      <li>Try again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Description */}
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            We onboard trusted mobile mechanics who run their own businesses and have a proven track record, with Google
            or Yelp reviews of 4 stars or higher.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600 mb-2">Track mechanic in real-time and get accurate ETA.</p>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-28 h-28 flex items-center justify-center mb-2">
                <div className="w-20 h-20 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-gray-500 inline-flex items-center justify-center">📅</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Book Appointments Online</h3>
              <p className="text-gray-600">
                Schedule repair or maintenance services at a time and date that works for you.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${i < 4 ? "text-[#294a46] fill-current" : "text-[#294a46] fill-none"}`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-.181h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ratings and Reviews</h3>
              <p className="text-gray-600 mb-2">Read and write reviews for mechanics to ensure quality service.</p>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Options Section */}
      <section className="bg-[#294a46] text-white py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Register Car */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">🚗</span>
              <h3 className="text-xl font-bold mb-2">Register your Car</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Find trusted mechanics</p>
                <p className="text-sm">Schedule and track repairs</p>
                <p className="text-sm">Rate and Review Services</p>
              </div>
              <Link href="/signup" className="text-sm flex items-center gap-1 text-white hover:underline">
                Get Started <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Register Mechanic */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">⚙️</span>
              <h3 className="text-xl font-medium mb-2">Register Mobile Mechanic</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Get job requests</p>
                <p className="text-sm">Manage your Schedule</p>
                <p className="text-sm">Showcase your skills</p>
              </div>
              <Link href="/signup" className="text-sm flex items-center gap-1 text-white hover:underline">
                Get Started <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Register Shop */}
            <div className="flex flex-col items-center justify-center mx-auto text-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl leading-none text-white inline-flex items-center justify-center mb-4">🏪</span>
              <h3 className="text-xl font-medium mb-2">Register your Shop</h3>
              <div className="space-y-1 mb-2">
                <p className="text-sm">Custom pricing and quotes</p>
                <p className="text-sm">Customer Reviews and Ratings</p>
                <p className="text-sm">Promote your Services</p>
              </div>
              <span className="text-sm text-gray-300">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Remove all outline and glow effects from continue button */
        button[type="submit"] {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        button[type="submit"]:hover,
        button[type="submit"]:focus,
        button[type="submit"]:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Screen reader only class */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Custom tooltip animations */
        .tooltip-enter {
          opacity: 0;
          transform: translateY(-5px) translateX(-50%);
        }
        
        .tooltip-enter-active {
          opacity: 1;
          transform: translateY(0) translateX(-50%);
          transition: all 0.2s ease-out;
        }
      `}</style>

      {/* Debug: Log when map update is triggered by location change */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Remove all outline and glow effects from continue button */
        button[type="submit"] {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        button[type="submit"]:hover,
        button[type="submit"]:focus,
        button[type="submit"]:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Screen reader only class */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Custom tooltip animations */
        .tooltip-enter {
          opacity: 0;
          transform: translateY(-5px) translateX(-50%);
        }
        
        .tooltip-enter-active {
          opacity: 1;
          transform: translateY(0) translateX(-50%);
          transition: all 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

// Loading fallback component
function HomePageLoading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Main export with Suspense wrapper
export default function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  )
}
