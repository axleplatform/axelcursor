// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from 'lucide-react'

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Initialize Google Maps Autocomplete
  const initializeAutocomplete = useCallback(async () => {
    if (!inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { createAutocomplete } = await import('@/lib/google-maps');
      
      const result = await createAutocomplete(inputRef.current, {
        onPlaceSelect: (place: any) => {
          if (place.geometry) {
            const address = place.formatted_address || '';
            onChange(address);
            if (onLocationSelect) onLocationSelect(place);
          }
        },
        onError: (err: string) => {
          console.warn('Autocomplete error:', err);
          setError(err);
        }
      });

      if (result.success) {
        autocompleteRef.current = result.autocomplete;
        console.log('✅ Autocomplete initialized successfully');
      } else {
        console.warn('⚠️ Autocomplete not available, using manual input');
        setError('Autocomplete not available');
      }
    } catch (err) {
      console.error('❌ Failed to initialize autocomplete:', err);
      setError('Failed to load location suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [onChange, onLocationSelect]);

  // Initialize on mount
  useEffect(() => {
    initializeAutocomplete();
  }, [initializeAutocomplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        try {
          autocompleteRef.current = null;
        } catch (err) {
          console.warn('Error cleaning up autocomplete:', err);
        }
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative location-input-wrapper">
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
          placeholder="Type your address here..."
          className="w-full h-[50px] pl-10 pr-4 text-base border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46] transition-all duration-200 relative z-50"
          required={required}
          disabled={isLoading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
