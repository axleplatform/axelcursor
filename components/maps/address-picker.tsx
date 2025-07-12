import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import GoogleMapsMap from '../google-maps-map';
import { useJsApiLoader } from '@react-google-maps/api';

interface AddressPickerProps { 
  onLocationSelect: (location: { 
    address: string; 
    coordinates: { lat: number; lng: number }; 
    placeId?: string; 
  }) => void; 
}

// Define the event type for the new PlaceAutocompleteElement
interface PlaceSelectEvent {
  place: any
}

export function AddressPicker({ onLocationSelect }: AddressPickerProps) { 
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
  const [markerPosition, setMarkerPosition] = useState(center);
  const [isUpdating, setIsUpdating] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    fetch('/api/maps-config')
      .then(res => res.json())
      .then(data => setApiKey(data.apiKey || ''));
  }, []);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ['places']
  });

  if (!apiKey) {
    return <div className="h-[400px] bg-gray-100 animate-pulse flex items-center justify-center">Loading...</div>;
  }

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

  // Initialize Google Maps Autocomplete with modern approach
  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const initializeAutocomplete = async () => {
      if (!inputRef.current || isUpdating || !isLoaded || !mounted) return;

      try {
        setIsLoading(true);
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        const google = await loadGoogleMaps();

        // Create autocomplete element using new API
        autocompleteInstance = new google.maps.places.PlaceAutocompleteElement({});
        
        // Configure the autocomplete element
        autocompleteInstance.setAttribute('placeholder', 'Enter your service address');
        autocompleteInstance.setAttribute('types', 'address');
        autocompleteInstance.setAttribute('component-restrictions', 'us');
        autocompleteInstance.setAttribute('fields', 'address_components,geometry,formatted_address,place_id');

        // Handle place selection
        autocompleteInstance.addEventListener('gmp-placeselect', (event: any) => {
          if (!mounted) return;
          const place = event.place;
          handlePlaceSelection(place);
        });

        // Replace the input element with the autocomplete element
        const inputContainer = inputRef.current.parentElement;
        if (mounted && inputContainer && inputRef.current) {
          // Clear the container and append the new autocomplete element
          inputContainer.innerHTML = '';
          inputContainer.appendChild(autocompleteInstance);
          autocompleteRef.current = autocompleteInstance;
        }

      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAutocomplete();

    return () => {
      mounted = false;
      // Remove all listeners from autocompleteInstance if needed
      if (autocompleteInstance) {
        try {
          google.maps.event.clearInstanceListeners(autocompleteInstance);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [handlePlaceSelection, isUpdating, isLoaded]);

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
      geocoder.geocode({ location }, (results: any[] | null, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
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
            placeholder="Enter your service address"
            className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white relative z-10 focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
          />
        </div>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          Drag Pin to Exact Location
        </p>
        <GoogleMapsMap
          center={center}
          height="300px"
          showMarker={true}
          draggable={true}
          onLocationSelect={handleMapLocationSelect}
          location={address}
        />
      </div>
    </div>
  );
}
