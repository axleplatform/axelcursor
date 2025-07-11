"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import GoogleMapsMap from './google-maps-map'
import { GooglePlacesAutocomplete } from './google-places-autocomplete'

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

export default function HomepageLocationInput({
  value,
  onChange,
  error,
  onLocationSelect
}: HomepageLocationInputProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handlePlaceSelect = (place: any) => {
    // Handle both new and old API formats
    if (place.location) {
      // New API format
      place.location.then((loc: any) => {
        const lat = loc.lat()
        const lng = loc.lng()
        const address = place.displayName || place.formattedAddress || value

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
        }
      })
    } else if (place.geometry) {
      // Old API format
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const address = place.formatted_address || value

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
      }
    }
  }

  // Handle manual input changes
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
        <GooglePlacesAutocomplete
          onPlaceSelect={handlePlaceSelect}
          placeholder="Enter complete address (123 Main St, City, State)"
          className="pl-10"
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
