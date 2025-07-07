import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import GoogleMapsMap from '../google-maps-map';

interface AddressPickerProps { 
  onLocationSelect: (location: { 
    address: string; 
    coordinates: { lat: number; lng: number }; 
    placeId?: string; 
  }) => void; 
}

export function AddressPicker({ onLocationSelect }: AddressPickerProps) { 
  const inputRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
  const [markerPosition, setMarkerPosition] = useState(center);
  const [isUpdating, setIsUpdating] = useState(false);

  // Memoize the place selection handler to prevent infinite loops
  const handlePlaceSelection = useCallback((place: any) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || '';

      // Validate coordinates before proceeding
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setIsUpdating(true);
        setAddress(address);
        setCenter({ lat, lng });
        setMarkerPosition({ lat, lng });

        onLocationSelect({
          address,
          coordinates: { lat, lng },
          placeId: place.place_id
        });
        setIsUpdating(false);
      } else {
        console.error('Invalid coordinates received from place:', { lat, lng });
      }
    } else {
      console.warn('Place selected but no geometry available:', place);
    }
  }, [onLocationSelect]);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current || isUpdating) return;

      try {
        setIsLoading(true);
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        const google = await loadGoogleMaps();

        // Create autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry', 'formatted_address']
        });

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          handlePlaceSelection(place);
        });

      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();
  }, [handlePlaceSelection, isUpdating]);

  // Get user's current location on mount with guard
  useEffect(() => {
    if (isUpdating) return; // Prevent multiple rapid updates
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenter(userLocation);
          setMarkerPosition(userLocation);
          
          // Reverse geocode to get address
          reverseGeocode(userLocation);
        },
        (error) => {
          console.log('Location access denied, using default');
        }
      );
    }
  }, [isUpdating]);

  const reverseGeocode = useCallback(async (location: { lat: number; lng: number }) => {
    try {
      // Validate coordinates before reverse geocoding
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number' || 
          isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid coordinates for reverse geocoding:', location);
        return;
      }

      const { loadGoogleMaps } = await import('@/lib/google-maps');
      const google = await loadGoogleMaps();
      
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results: any[], status: any) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          setAddress(address);
          onLocationSelect({
            address,
            coordinates: location,
            placeId: results[0].place_id
          });
        }
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [onLocationSelect]);

  // Handle manual input changes - ONLY update local state, don't trigger callbacks
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    // Don't call onLocationSelect here - only on actual place selection
  }, []);

  // Handle map location selection
  const handleMapLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    // Validate coordinates before proceeding
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number' || 
        isNaN(location.lat) || isNaN(location.lng)) {
      console.error('Invalid coordinates from map selection:', location);
      return;
    }

    setIsUpdating(true);
    setAddress(location.address);
    setMarkerPosition({ lat: location.lat, lng: location.lng });
    
    if (onLocationSelect) {
      onLocationSelect({
        address: location.address,
        coordinates: { lat: location.lat, lng: location.lng },
        placeId: undefined
      });
    }
    setIsUpdating(false);
  }, [onLocationSelect]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter your service address
        </label>
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
            name="address"
            value={address}
            onChange={handleInputChange}
            placeholder="Start typing your address..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200">
        <GoogleMapsMap
          center={center}
          onLocationSelect={handleMapLocationSelect}
          height="400px"
          address={address}
          isLoading={isLoading}
          showMarker={true}
          draggable={true}
        />
      </div>

      <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <span className="mr-2">📍</span>
        Drag the pin to adjust your exact location
      </div>
    </div>
  );
}
