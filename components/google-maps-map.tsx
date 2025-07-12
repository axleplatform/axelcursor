// @ts-nocheck
"use client"

import React from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps';

interface GoogleMapsMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  className?: string
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  draggable?: boolean
  showMarker?: boolean
  location?: string
  isLoading?: boolean
}

export default function GoogleMapsMap({
  center = { lat: 37.7749, lng: -122.4194 },
  zoom = 13,
  height = "400px",
  className = "",
  onLocationSelect,
  draggable = true,
  showMarker = true,
  location,
  isLoading = false
}: GoogleMapsMapProps) {
  const { mapRef, isLoading: mapLoading, error } = useGoogleMaps({
    center,
    zoom,
    onLocationSelect,
    draggable,
    showMarker,
    location
  });

  if (mapLoading || isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <span>Loading map...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <MapPin className="h-8 w-8 mb-2" />
          <span>{error}</span>
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
