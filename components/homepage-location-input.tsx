// @ts-nocheck
import React from 'react';
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from 'lucide-react'
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

interface HomepageLocationInputProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (place: any) => void
  label?: string
  required?: boolean
}

export default function HomepageLocationInput({
  value,
  onChange,
  onLocationSelect,
  label,
  required
}: HomepageLocationInputProps) {
  const handlePlaceSelect = (place: any) => {
    if (place.geometry) {
      const address = place.formatted_address || '';
      if (onChange) onChange(address);
      if (onLocationSelect) onLocationSelect(place);
    }
  };

  const { inputRef, isLoading, isLoaded, error } = useGoogleMapsAutocomplete({
    onPlaceSelect: handlePlaceSelect,
    onInputChange: onChange
  });

  return (
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
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
