"use client"

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import GoogleMapsMap from './google-maps-map'

// At the top of the file, add these type definitions:
interface PlaceSelectEvent extends Event {
  place: {
    geometry?: {
      location?: google.maps.LatLng | google.maps.LatLngLiteral;
    };
    displayName?: string;
    formattedAddress?: string;
    id?: string;
  };
}

// Extend the HTMLElement event map
declare global {
  interface HTMLElementEventMap {
    'gmp-placeselect': PlaceSelectEvent;
  }
}

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  placeholder?: string
  label?: string
  error?: string
  showMap?: boolean
  mapHeight?: string
  className?: string
  required?: boolean
}

export default function LocationInput({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter your address",
  label = "Location",
  error,
  showMap = true,
  mapHeight = "300px",
  className = "",
  required = false
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    let mounted = true;
    let wrapper: HTMLDivElement | null = null;

    const initializeAutocomplete = async () => {
      if (!mounted || !inputRef.current) return;

      try {
        setIsLoading(true)
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps')
        const google = await loadGoogleMaps()

        if (!mounted || !inputRef.current) return;

        // Try new PlaceAutocompleteElement API first
        if (google.maps.places.PlaceAutocompleteElement) {
          const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: 'us' }
          })

          // Safer DOM manipulation: wrap input, hide it, insert autocomplete
          if (inputRef.current && inputRef.current.parentNode) {
            const parent = inputRef.current.parentNode;
            wrapper = document.createElement('div');
            wrapper.className = inputRef.current.className;
            parent.insertBefore(wrapper, inputRef.current);
            inputRef.current.style.display = 'none';
            wrapper.appendChild(autocompleteElement);
          }

          autocompleteElement.addEventListener('gmp-placeselect', (event: PlaceSelectEvent) => {
            const place = event.place
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              const address = place.formatted_address || value
              setCoordinates({ lat, lng })
              onChange(address)
              if (onLocationSelect) {
                onLocationSelect({ lat, lng, address })
              }
            }
          })
        } else {
          // Fallback to old API
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'geometry', 'formatted_address']
          })
          autocompleteRef.current = autocomplete
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              const address = place.formatted_address || value
              setCoordinates({ lat, lng })
              onChange(address)
              if (onLocationSelect) {
                onLocationSelect({ lat, lng, address })
              }
            }
          })
        }
      } catch (error) {
        console.error('Autocomplete error:', error)
        // Keep original input visible
        if (inputRef.current) {
          inputRef.current.style.display = 'block';
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeAutocomplete()

    return () => {
      mounted = false;
      // Clean up Google Maps elements and restore input
      if (inputRef.current) {
        inputRef.current.style.display = 'block';
      }
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    };
  }, [onChange, onLocationSelect, value, placeholder])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    // Clear coordinates when user manually types
    setCoordinates(null)
  }

  // Handle map location selection
  const handleMapLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setCoordinates({ lat: location.lat, lng: location.lng })
    onChange(location.address)
    
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 ${error ? 'border-red-500 focus:border-red-500' : ''}`}
          required={required}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Map */}
      {showMap && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Drag Pin to Exact Location
          </p>
          <GoogleMapsMap
            center={coordinates || { lat: 37.7749, lng: -122.4194 }}
            onLocationSelect={handleMapLocationSelect}
            height={mapHeight}
            location={value}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  )
}
