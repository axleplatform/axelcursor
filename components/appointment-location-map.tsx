"use client"

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface AppointmentLocationMapProps {
  address: string
  height?: string
  className?: string
  showMarker?: boolean
}

export default function AppointmentLocationMap({
  address,
  height = "200px",
  className = "",
  showMarker = true
}: AppointmentLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || !address) return

      try {
        setIsLoading(true)
        setMapError(null)

        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps, geocodeAddress, extractCoordinates } = await import('@/lib/google-maps')
        const google = await loadGoogleMaps()

        // Geocode the address
        const results = await geocodeAddress(address)
        if (!results || results.length === 0) {
          throw new Error('Address not found')
        }

        const coordinates = extractCoordinates(results[0])

        // Create map instance
        const map = new google.maps.Map(mapRef.current, {
          center: coordinates,
          zoom: 15,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID',
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        // Add marker
        if (showMarker) {
          new google.maps.marker.AdvancedMarkerElement({
            position: coordinates,
            map,
            title: 'Appointment location'
          })
        }

      } catch (error) {
        console.error('Error initializing map:', error)
        setMapError('Unable to display location on map')
      } finally {
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [address, showMarker])

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <MapPin className="h-6 w-6 mb-2" />
          <span className="text-sm">{mapError}</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    />
  )
}
