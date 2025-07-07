import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

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
  const [showMap, setShowMap] = useState(false);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [markerPosition, setMarkerPosition] = useState(center);
  const [isUpdating, setIsUpdating] = useState(false);

  // Memoize the place selection handler to prevent infinite loops
  const handlePlaceSelection = useCallback((place: google.maps.places.PlaceResult) => {
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
  }, [handlePlaceSelection, isUpdating]); // Remove onLocationSelect from dependencies

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
          console.log('Error getting location:', error);
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
      geocoder.geocode({ location }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
        if (status === 'OK' && results[0]) {
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
          name="address"
          value={address}
          onChange={handleInputChange}
          placeholder="Enter complete address (123 Main St, City, State)"
          autoFocus={true}
          className="block w-full p-4 pl-10 pr-16 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white relative z-10 transition-all duration-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <p className="text-gray-500">Start typing to see address suggestions</p>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showMap ? 'Hide' : 'Show'} Map
        </button>
      </div>

      {/* Optional Map View */}
      {showMap && (
        <div className="mt-3">
          <div className="h-[220px] bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 flex flex-col items-center">
              <MapPin className="h-10 w-10 mb-2" />
              <span>Interactive Map View</span>
              <p className="text-xs mt-1">Google Maps integration coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 