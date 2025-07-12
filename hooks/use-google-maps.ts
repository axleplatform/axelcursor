// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, geocodeAddress, extractCoordinates, reverseGeocode, formatAddress } from '@/lib/google-maps';

interface UseGoogleMapsOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  draggable?: boolean;
  showMarker?: boolean;
  location?: string;
}

interface UseGoogleMapsReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  error: string | null;
  mapInstance: any;
  markerInstance: any;
}

export function useGoogleMaps({
  center = { lat: 37.7749, lng: -122.4194 },
  zoom = 13,
  onLocationSelect,
  draggable = true,
  showMarker = true,
  location
}: UseGoogleMapsOptions): UseGoogleMapsReturn {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const google = await loadGoogleMaps();

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
      });

      mapInstanceRef.current = map;

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
        });

        markerInstanceRef.current = marker;

        // Handle marker drag events
        if (draggable && onLocationSelect) {
          marker.addListener('dragend', async () => {
            const position = marker.getPosition();
            if (position) {
              try {
                const results = await reverseGeocode(position.lat(), position.lng());
                if (results && results[0]) {
                  const address = formatAddress(results[0]);
                  onLocationSelect({
                    lat: position.lat(),
                    lng: position.lng(),
                    address
                  });
                }
              } catch (error) {
                console.error('Error reverse geocoding:', error);
              }
            }
          });
        }

        // Handle map click events
        if (onLocationSelect) {
          map.addListener('click', async (event: any) => {
            const position = event.latLng;
            if (position) {
              marker.setPosition(position);
              
              try {
                const results = await reverseGeocode(position.lat(), position.lng());
                if (results && results[0]) {
                  const address = formatAddress(results[0]);
                  onLocationSelect({
                    lat: position.lat(),
                    lng: position.lng(),
                    address
                  });
                }
              } catch (error) {
                console.error('Error reverse geocoding:', error);
              }
            }
          });
        }
      }

      // If location is provided, geocode it and center the map
      if (location) {
        try {
          const results = await geocodeAddress(location);
          if (results && results[0]) {
            const coordinates = extractCoordinates(results[0]);
            map.setCenter(coordinates);
            if (markerInstanceRef.current) {
              markerInstanceRef.current.setPosition(coordinates);
            }
          }
        } catch (error) {
          console.error('Error geocoding location:', error);
        }
      }

    } catch (err) {
      console.error('Error initializing map:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map');
    } finally {
      setIsLoading(false);
    }
  }, [center, zoom, showMarker, draggable, onLocationSelect, location]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Update marker position when center changes
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
      markerInstanceRef.current.setPosition(center);
    }
  }, [center]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup map and marker instances
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setMap(null);
        markerInstanceRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return {
    mapRef,
    isLoading,
    error,
    mapInstance: mapInstanceRef.current,
    markerInstance: markerInstanceRef.current
  };
} 