"use client"

import React, { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'

interface SimpleMapProps {
  center?: { lat: number; lng: number }
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  address?: string
  isLoading?: boolean
}

const mapContainerStyle = {
  width: '100%',
  height: '220px'
}

const defaultCenter = { lat: 37.7749, lng: -122.4194 } // San Francisco

export default function SimpleMap({
  center = defaultCenter,
  onLocationSelect,
  address,
  isLoading = false
}: SimpleMapProps) {
  const [markerPosition, setMarkerPosition] = useState(center)
  const [isMapLoading, setIsMapLoading] = useState(true)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  })

  const onLoad = useCallback(() => {
    setIsMapLoading(false)
  }, [])

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && onLocationSelect) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      setMarkerPosition({ lat, lng })
      
      // Simple reverse geocoding using Google's Geocoder
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onLocationSelect({
            lat,
            lng,
            address: results[0].formatted_address
          })
        } else {
          onLocationSelect({
            lat,
            lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          })
        }
      })
    }
  }, [onLocationSelect])

  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && onLocationSelect) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      setMarkerPosition({ lat, lng })
      
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onLocationSelect({
            lat,
            lng,
            address: results[0].formatted_address
          })
        } else {
          onLocationSelect({
            lat,
            lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          })
        }
      })
    }
  }, [onLocationSelect])

  if (isLoading || isMapLoading || !isLoaded) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg animate-pulse"
        style={{ height: '220px' }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <span>Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        onClick={onMapClick}
        onLoad={onLoad}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >
        <Marker
          position={markerPosition}
          draggable={!!onLocationSelect}
          onDragEnd={onMarkerDragEnd}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#294a46"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 24)
          }}
        />
      </GoogleMap>
    </div>
  )
}
