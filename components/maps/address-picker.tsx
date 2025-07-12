// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import GoogleMapsMap from '../google-maps-map';
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

interface AddressPickerProps { 
  onLocationSelect: (location: { 
    address: string; 
    coordinates: { lat: number; lng: number }; 
    placeId?: string; 
  }) => void; 
}

export function AddressPicker({ onLocationSelect }: AddressPickerProps) { 
  const [address, setAddress] = useState('');
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  const { inputRef, isLoading, isLoaded, error } = useGoogleMapsAutocomplete({
    onPlaceSelect: handlePlaceSelection
  });

  // Handle map location selection
  const handleMapLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    setCenter({ lat: location.lat, lng: location.lng });
    setAddress(location.address);
    
    onLocationSelect({
      address: location.address,
      coordinates: { lat: location.lat, lng: location.lng }
    });
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
            disabled={isLoading}
          />
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
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
