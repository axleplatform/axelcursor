"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

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
  center = { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
  zoom = 13,
  height = "400px",
  className = "",
  onLocationSelect,
  draggable = true,
  showMarker = true,
  location,
  isLoading = false
}: GoogleMapsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return

    try {
      setIsMapLoading(true)
      setMapError(null)

      // Dynamic import to avoid SSR issues
      const { loadGoogleMaps, geocodeAddress, extractCoordinates } = await import('@/lib/google-maps')
      const google = await loadGoogleMaps()

      // Create map instance
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
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
      })

      mapInstanceRef.current = map

      // Add marker if needed
      if (showMarker) {
        const marker = new google.maps.Marker({
          position: center,
          map,
          draggable: draggable && !!onLocationSelect,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#294a46"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 24)
          }
        })

        markerRef.current = marker

        // Handle marker drag events
        if (draggable && onLocationSelect) {
          marker.addListener('dragend', async () => {
            const position = marker.getPosition()
            if (position) {
              try {
                const results = await reverseGeocode(position.lat(), position.lng())
                if (results && results[0]) {
                  const address = formatAddress(results[0])
                  onLocationSelect({
                    lat: position.lat(),
                    lng: position.lng(),
                    address
                  })
                }
              } catch (error) {
                console.error('Error reverse geocoding:', error)
              }
            }
          })
        }

        // Handle map click events
        if (onLocationSelect) {
          map.addListener('click', async (event: google.maps.MapMouseEvent) => {
            const position = event.latLng
            if (position) {
              marker.setPosition(position)
              
              try {
                const results = await reverseGeocode(position.lat(), position.lng())
                if (results && results[0]) {
                  const address = formatAddress(results[0])
                  onLocationSelect({
                    lat: position.lat(),
                    lng: position.lng(),
                    address
                  })
                }
              } catch (error) {
                console.error('Error reverse geocoding:', error)
              }
            }
          })
        }
      }

      // If location is provided, geocode it and center the map
      if (location) {
        try {
          const results = await geocodeAddress(location)
          if (results && results[0]) {
            const coordinates = extractCoordinates(results[0])
            map.setCenter(coordinates)
            if (markerRef.current) {
              markerRef.current.setPosition(coordinates)
            }
          }
        } catch (error) {
          console.error('Error geocoding location:', error)
        }
      }

    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Failed to load map. Please try again.')
    } finally {
      setIsMapLoading(false)
    }
  }, [center, zoom, showMarker, draggable, onLocationSelect, location])

  // Initialize map on mount
  useEffect(() => {
    initializeMap()
  }, [initializeMap])

  // Update marker position when center changes
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setCenter(center)
      markerRef.current.setPosition(center)
    }
  }, [center])

  // Helper functions (these would be imported from the lib file)
  const reverseGeocode = async (lat: number, lng: number) => {
    const { reverseGeocode } = await import('@/lib/google-maps')
    return reverseGeocode(lat, lng)
  }

  const formatAddress = (result: any) => {
    // Import formatAddress from the lib - it's a synchronous function
    const addressComponents = result.address_components
    const streetNumber = addressComponents.find((component: any) => 
      component.types.includes('street_number')
    )?.long_name || ''
    
    const route = addressComponents.find((component: any) => 
      component.types.includes('route')
    )?.long_name || ''
    
    const locality = addressComponents.find((component: any) => 
      component.types.includes('locality')
    )?.long_name || ''
    
    const administrativeArea = addressComponents.find((component: any) => 
      component.types.includes('administrative_area_level_1')
    )?.short_name || ''
    
    const postalCode = addressComponents.find((component: any) => 
      component.types.includes('postal_code')
    )?.long_name || ''
    
    return `${streetNumber} ${route}, ${locality}, ${administrativeArea} ${postalCode}`.trim()
  }

  if (isLoading || isMapLoading) {
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

  if (mapError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center text-gray-500">
          <MapPin className="h-8 w-8 mb-2" />
          <span>{mapError}</span>
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
