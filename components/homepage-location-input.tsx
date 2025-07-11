"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import GoogleMapsMap from './google-maps-map'

interface HomepageLocationInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  onLocationSelect?: (location: { 
    address: string; 
    coordinates: { lat: number; lng: number }; 
    placeId?: string; 
  }) => void
}

// Define the event type for the new PlaceAutocompleteElement
interface PlaceSelectEvent {
  place: any
}

export default function HomepageLocationInput({
  value,
  onChange,
  error,
  onLocationSelect
}: HomepageLocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Memoize the place selection handler to prevent infinite loops
  const handlePlaceSelection = useCallback((place: any) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const address = place.formatted_address || value

      // Validate coordinates before proceeding
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setIsUpdating(true)
        setCoordinates({ lat, lng })
        onChange(address)

        if (onLocationSelect) {
          onLocationSelect({ 
            address, 
            coordinates: { lat, lng }, 
            placeId: place.place_id 
          })
        }
        setIsUpdating(false)
      } else {
        console.error('Invalid coordinates received from place:', { lat, lng })
      }
    } else {
      console.warn('Place selected but no geometry available:', place)
    }
  }, [onChange, onLocationSelect, value])

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current || isUpdating) return

      try {
        setIsLoading(true)
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps')
        const google = await loadGoogleMaps()

        const initializeAutocompleteFunction = (inputRef: React.RefObject<HTMLInputElement>) => {
          if (!inputRef.current || !google?.maps?.places) return

          try {
            // Try new PlaceAutocompleteElement API first
            if (google.maps.places.PlaceAutocompleteElement) {
              console.log('Using new PlaceAutocompleteElement API')
              
              const autocomplete = new google.maps.places.PlaceAutocompleteElement({
                componentRestrictions: { country: 'us' }
                // NO fields property here
              })
              
              // Replace input with autocomplete element
              inputRef.current.parentNode?.replaceChild(autocomplete, inputRef.current)
              autocompleteRef.current = autocomplete
              
              // Listen for selection
              autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
                const place = event.place
                console.log('Place selected (new API):', place)
                
                if (place) {
                  try {
                    // The new API returns place details differently
                    const location = await place.location
                    const lat = location?.lat()
                    const lng = location?.lng()
                    const address = place.formattedAddress || place.displayName || value

                    // Validate coordinates before proceeding
                    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                      setIsUpdating(true)
                      setCoordinates({ lat, lng })
                      onChange(address)

                      if (onLocationSelect) {
                        onLocationSelect({ 
                          address, 
                          coordinates: { lat, lng }, 
                          placeId: place.id 
                        })
                      }
                      setIsUpdating(false)
                    } else {
                      console.error('Invalid coordinates received from place:', { lat, lng })
                    }
                  } catch (error) {
                    console.error('Error processing place:', error)
                  }
                }
              })
            } else {
              // Fallback to old API
              console.log('Falling back to old Autocomplete API')
              
              const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                types: ['geocode'],
                componentRestrictions: { country: 'us' },
                fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
              })
              
              autocompleteRef.current = autocomplete

              autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace()
                console.log('Place selected (old API):', place)
                
                if (place.geometry && place.geometry.location) {
                  const lat = place.geometry.location.lat()
                  const lng = place.geometry.location.lng()
                  const address = place.formatted_address || value

                  // Validate coordinates before proceeding
                  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                    setIsUpdating(true)
                    setCoordinates({ lat, lng })
                    onChange(address)

                    if (onLocationSelect) {
                      onLocationSelect({ 
                        address, 
                        coordinates: { lat, lng }, 
                        placeId: place.place_id 
                      })
                    }
                    setIsUpdating(false)
                  } else {
                    console.error('Invalid coordinates received from place:', { lat, lng })
                  }
                } else {
                  console.warn('Place selected but no geometry available:', place)
                }
              })
            }
          } catch (error) {
            console.error('Autocomplete initialization failed:', error)
            // Keep the original input functional
          }
        }

        // Initialize the autocomplete
        initializeAutocompleteFunction(inputRef)

      } catch (error) {
        console.error('Failed to load Google Maps:', error)
        // Fallback to manual input - keep the original input
      } finally {
        setIsLoading(false)
      }
    }

    initializeAutocomplete()
  }, [onChange, onLocationSelect, value])

  // Handle manual input changes - ONLY update local state, don't trigger callbacks
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    // Clear coordinates when user manually types
    setCoordinates(null)
  }, [onChange])

  // Handle map location selection
  const handleMapLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    // Validate coordinates before proceeding
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number' || 
        isNaN(location.lat) || isNaN(location.lng)) {
      console.error('Invalid coordinates from map selection:', location);
      return;
    }

    setIsUpdating(true)
    setCoordinates({ lat: location.lat, lng: location.lng })
    onChange(location.address)
    
    if (onLocationSelect) {
      onLocationSelect({
        address: location.address,
        coordinates: { lat: location.lat, lng: location.lng },
        placeId: undefined
      })
    }
    setIsUpdating(false)
  }, [onChange, onLocationSelect])

  return (
    <div className="mb-3">
      <h2 className="text-lg font-medium mb-1">Enter your location</h2>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-20">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          name="location"
          value={value}
          onChange={handleInputChange}
          placeholder="Enter complete address (123 Main St, City, State)"
          autoFocus={true}
          className={`block w-full p-4 pl-10 pr-16 text-sm text-gray-900 border rounded-lg bg-white relative z-10 transition-all duration-300 ${
            error 
              ? "border-red-500" 
              : "border-gray-300"
          }`}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <div className="flex items-center justify-between text-xs mt-1">
        <p className="text-gray-500">Drag Pin to Exact Location</p>
      </div>

      {/* Always Show Map */}
      <div className="mt-3">
        <GoogleMapsMap
          center={coordinates || { lat: 37.7749, lng: -122.4194 }}
          height="220px"
          showMarker={true}
          draggable={true}
          onLocationSelect={handleMapLocationSelect}
          location={value}
        />
      </div>
    </div>
  )
}
