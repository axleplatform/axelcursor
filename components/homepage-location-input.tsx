// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
  const [retryKey, setRetryKey] = useState(0);

  const handlePlaceSelect = (place: any) => {
    if (place.geometry) {
      const address = place.formatted_address || '';
      if (onChange) onChange(address);
      if (onLocationSelect) onLocationSelect(place);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const { inputRef, isLoading, isLoaded, error } = useGoogleMapsAutocomplete({
    onPlaceSelect: handlePlaceSelect
  });

  // Retry mechanism if initialization fails
  useEffect(() => {
    if (error && !isLoading) {
      const timer = setTimeout(() => {
        setRetryKey(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error, isLoading]);

  // Debug effect to check if input is visible
  useEffect(() => {
    if (inputRef.current) {
      console.log('Input element:', inputRef.current);
      console.log('Input visible:', inputRef.current.offsetParent !== null);
      console.log('Input dimensions:', {
        offsetWidth: inputRef.current.offsetWidth,
        offsetHeight: inputRef.current.offsetHeight,
        clientWidth: inputRef.current.clientWidth,
        clientHeight: inputRef.current.clientHeight
      });
    }
  }, [inputRef.current]);

  return (
    <div className="space-y-2" key={retryKey}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative location-input-container">
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
          onChange={handleInputChange}
          placeholder="Enter your address"
          className="pl-10 w-full h-[46px] text-sm border border-gray-200 rounded-md bg-white relative z-10"
          required={required}
          disabled={isLoading}
          style={{
            position: 'relative',
            zIndex: 10,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            paddingLeft: '2.5rem',
            paddingRight: '0.75rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            width: '100%',
            height: '46px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
