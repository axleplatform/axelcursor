// @ts-nocheck
import React from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

interface MechanicLocationInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  label?: string
  required?: boolean
}

export default function MechanicLocationInput({
  value,
  onChange,
  error,
  onLocationSelect,
  label = "Location address",
  required = false
}: MechanicLocationInputProps) {
  const handlePlaceSelect = (place: any) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || value;

      onChange(address);

      if (onLocationSelect) {
        onLocationSelect({ lat, lng, address });
      }
    }
  };

  const { inputRef, isLoading, isLoaded, error: autocompleteError } = useGoogleMapsAutocomplete({
    onPlaceSelect: handlePlaceSelect,
    onInputChange: onChange
  });

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Enter your address"
          className="pl-10"
          required={required}
          disabled={isLoading}
        />
      </div>
      {(error || autocompleteError) && (
        <p className="text-sm text-red-600">{error || autocompleteError}</p>
      )}
    </div>
  );
}
