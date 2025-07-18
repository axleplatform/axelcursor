"use client"

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import GoogleMapsMap from './google-maps-map'
import { GooglePlacesAutocomplete } from './google-places-autocomplete'

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
  const [isLoading, setIsLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const handlePlaceSelect = (place: any) => {
    // Handle both new and old API formats
    if (place.location) {
      // New API format
      place.location.then((loc: any) => {
        const lat = loc.lat()
        const lng = loc.lng()
        const address = place.displayName || place.formattedAddress || value

        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          setCoordinates({ lat, lng })
          onChange(address)

          if (onLocationSelect) {
            onLocationSelect({ lat, lng, address })
          }
        }
      })
    } else if (place.geometry) {
      // Old API format
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const address = place.formatted_address || value

      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setCoordinates({ lat, lng })
        onChange(address)

        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address })
        }
      }
    }
  }

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
        <GooglePlacesAutocomplete
          onPlaceSelect={handlePlaceSelect}
          placeholder={placeholder}
          className="pl-10 pr-12"
        />
        {/* GPS Location Button */}
        <button
          type="button"
          onClick={async () => {
            setIsLoading(true)
            try {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude, longitude } = position.coords
                    
                    // Use reverse geocoding to get address
                    try {
                      const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                      )
                      const data = await response.json()
                      
                      if (data.results && data.results[0]) {
                        const address = data.results[0].formatted_address
                        setCoordinates({ lat: latitude, lng: longitude })
                        onChange(address)
                        
                        if (onLocationSelect) {
                          onLocationSelect({ lat: latitude, lng: longitude, address })
                        }
                      }
                    } catch (error) {
                      console.error('Error getting address:', error)
                      // Fallback to coordinates if geocoding fails
                      const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                      setCoordinates({ lat: latitude, lng: longitude })
                      onChange(address)
                      
                      if (onLocationSelect) {
                        onLocationSelect({ lat: latitude, lng: longitude, address })
                      }
                    }
                    setIsLoading(false)
                  },
                  (error) => {
                    console.error('Error getting location:', error)
                    setIsLoading(false)
                    alert('Unable to get your location. Please check your browser permissions.')
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                  }
                )
              } else {
                setIsLoading(false)
                alert('Geolocation is not supported by this browser.')
              }
            } catch (error) {
              console.error('Error accessing geolocation:', error)
              setIsLoading(false)
              alert('Error accessing location. Please check your browser permissions.')
            }
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          title="Get my current location"
        >
          <div className="w-6 h-6 text-[#294a46] hover:text-[#1e3632] transition-colors">
            📌
          </div>
        </button>
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
