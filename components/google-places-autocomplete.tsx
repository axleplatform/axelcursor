// @ts-nocheck
import React, { useState } from 'react'
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: any) => void
  placeholder?: string
  className?: string
  value?: string
  onChange?: (value: string) => void
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Enter your address",
  className = "",
  value = "",
  onChange
}: GooglePlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const { inputRef, isLoading, isLoaded, error } = useGoogleMapsAutocomplete({
    onPlaceSelect
  });

  return (
    <div className={`google-places-container ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}
