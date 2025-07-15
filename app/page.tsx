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
import ErrorBoundary from "@/components/error-boundary"

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

interface SupabaseQueryResult {
  data: unknown
  error: unknown
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function HomePageContent(): React.JSX.Element {
  console.log('🔍 HomePageContent: Starting component initialization')
  
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

  console.log('🔍 HomePageContent: State and refs initialized')

  // 2. ALL function definitions in dependency order
  // Functions with no dependencies first
  const showCoordinates = useCallback((lat: number, lng: number) => {
    return `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, []);

  console.log('🔍 HomePageContent: Basic functions defined')

  // Form handling functions (no dependencies on other functions)
  const handleChange = React.useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData((prev: AppointmentFormData) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name as keyof AppointmentFormData]) {
      setErrors((prev: typeof errors) => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  // Location input handler
  const handleLocationChange = useCallback((value: string) => {
    setFormData((prev: AppointmentFormData) => ({ ...prev, location: value }))
    if (errors.location) {
      setErrors((prev: typeof errors) => ({ ...prev, location: undefined }))
    }
  }, [errors.location])

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

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

  // Map initialization function
  const initializeMap = useCallback(async () => {
    try {
      console.log('🗺️ Map init: Starting map initialization...');
      
      if (!mapRef.current || mapInstanceRef.current) {
        console.log('🗺️ Map init: Early return - map already initialized or ref not ready');
        return;
      }

      console.log('🗺️ Map init: Importing Google Maps...');
      const { initializeGoogleMaps } = await import('@/lib/google-maps');
      
      console.log('🗺️ Map init: Creating map...');
      const result = await initializeGoogleMaps(mapRef.current, {
        onMapLoad: () => {
          console.log('✅ Map loaded successfully');
          setMapLoaded(true);
        },
        onError: (err: string) => {
          console.warn('Map error:', err);
        }
      });

      if (result.success) {
        mapInstanceRef.current = result.map;
        console.log('✅ Map initialized successfully');
      } else {
        console.warn('⚠️ Map not available');
      }
    } catch (err) {
      console.error('❌ Failed to initialize map:', err);
    }
  }, []);

  console.log('🔍 HomePageContent: All functions defined')

  // 3. ALL useEffects last (after all functions they use are defined)
  // Debug: Log form field changes
  useEffect(() => {
    console.log('[DEBUG] formData:', formData);
  }, [formData]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Restore appointment data from URL
  useEffect(() => {
    const restoreAppointmentData = async () => {
      if (!appointmentId) return;

      try {
        setIsLoadingExistingData(true);
        console.log('🔄 Restoring appointment data for ID:', appointmentId);

        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (error) {
          console.error('❌ Error fetching appointment:', error);
          toast({
            title: "Error",
            description: "Failed to load appointment data",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          console.log('✅ Appointment data restored:', data);
          setFormData({
            location: data.location || "",
            vin: data.vin || "",
            year: data.year || "",
            make: data.make || "",
            model: data.model || "",
            mileage: data.mileage || "",
            appointmentDate: data.appointment_date || "",
            appointmentTime: data.appointment_time || "",
            issueDescription: data.issue_description || "",
            selectedServices: data.selected_services || [],
            carRuns: data.car_runs,
            latitude: data.latitude,
            longitude: data.longitude,
            place_id: data.place_id,
            phone: data.phone,
            email: data.email,
          });
        }
      } catch (err) {
        console.error('❌ Error restoring appointment data:', err);
      } finally {
        setIsLoadingExistingData(false);
      }
    };

    restoreAppointmentData();
  }, [appointmentId]);

  console.log('🔍 HomePageContent: Component fully initialized, rendering JSX')

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
              onLocationSelect={(place) => {
                console.log('Location selected:', place)
                setSelectedLocation(place)
                setFormData(prev => ({
                  ...prev,
                  location: place.formatted_address || "",
                  latitude: place.geometry?.location?.lat(),
                  longitude: place.geometry?.location?.lng(),
                  place_id: place.place_id
                }))
              }}
              label="Enter your location"
              required
            />
          </div>

          {/* Map Container */}
          <div className="mb-6">
            <div
              ref={mapRef}
              className="w-full h-64 rounded-lg border border-gray-200 bg-gray-50"
              style={{ minHeight: '256px' }}
            >
              {!mapLoaded && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a46] mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            console.log('Form submitted')
          }}>
            {/* Car Selector */}
            <div className="mb-2 w-full">
              {/* Desktop layout: All fields in one row */}
              <div className="hidden sm:flex gap-2">
                <div className="relative w-[8ch]">
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.year 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Year</option>
                    {(() => {
                      const currentYear = new Date().getFullYear()
                      const years = []
                      
                      for (let year = currentYear; year >= currentYear - 29; year--) {
                        years.push(year)
                      }
                      
                      return years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    })()}
                  </select>
                  {errors.year && <p className="text-red-500 text-xs absolute -bottom-5">{errors.year}</p>}
                </div>

                <div className="relative w-[20%]">
                  <select
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    className={`w-full h-[46px] px-2 pr-6 text-sm border rounded-md bg-gray-50 appearance-none transition-all duration-300 ${
                      errors.make 
                        ? "border-red-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Make</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Honda">Honda</option>
                    <option value="Ford">Ford</option>
                  </select>
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
                  />
                  {errors.model && <p className="text-red-500 text-xs absolute -bottom-5">{errors.model}</p>}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting || !isFormComplete}
                className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                  isFormComplete && !isSubmitting
                    ? 'bg-[#294a46] text-white hover:bg-[#1a2f2c]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

function HomePageLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function HomePage(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Suspense fallback={<HomePageLoading />}>
        <HomePageContent />
      </Suspense>
    </ErrorBoundary>
  )
}
