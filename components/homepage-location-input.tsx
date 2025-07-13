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
    try {
      console.log('🔍 Autocomplete init: Starting initialization...');
      
      if (!inputRef.current || autocompleteRef.current) {
        console.log('🔍 Autocomplete init: Early return - refs not ready');
        return;
      }

      console.log('🔍 Autocomplete init: Setting loading state...');
      setIsLoading(true);
      setError(null);

      console.log('🔍 Autocomplete init: Importing createAutocomplete...');
      const { createAutocomplete } = await import('@/lib/google-maps');
      
      console.log('🔍 Autocomplete init: Creating autocomplete...');
      console.log('🔍 Autocomplete init: onLocationSelect type:', typeof onLocationSelect);
      console.log('🔍 Autocomplete init: onLocationSelect:', onLocationSelect);
      
      const result = await createAutocomplete(inputRef.current, {
        onPlaceSelect: (place: any) => {
          console.log('🔍 Autocomplete: Place selected:', place);
          if (place.geometry) {
            const address = place.formatted_address || '';
            onChange(address);
            if (typeof onLocationSelect === 'function') {
              onLocationSelect(place);
            } else {
              console.log('🔍 Autocomplete: onLocationSelect is not a function, skipping');
            }
          }
        },
        onError: (err: string) => {
          console.warn('Autocomplete error:', err);
          setError(err);
        }
      });

      console.log('🔍 Autocomplete init: Checking result...');
      if (result.success) {
        autocompleteRef.current = result.autocomplete;
        console.log('✅ Autocomplete initialized successfully');
      } else {
        console.warn('⚠️ Autocomplete not available, using manual input');
        setError('Autocomplete not available');
      }
    } catch (err) {
      console.error('❌ Failed to initialize autocomplete:', err);
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error name:', err.name);
      setError('Failed to load location suggestions');
    } finally {
      console.log('🔍 Autocomplete init: Setting loading to false');
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
          {label}
        </label>
      )}
      <div className="relative location-input-wrapper">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ zIndex: 10 }}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <span className="text-gray-400">📍</span>
          )}
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Type your address here..."
          className="location-input w-full h-[50px] pl-10 pr-4 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-300 focus:shadow-none transition-none"
          required={required}
          disabled={isLoading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      <style jsx>{`
        /* Remove all focus styles from location input */
        .location-input:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: #d1d5db !important; /* gray-300 */
        }

        /* Remove focus-visible styles too */
        .location-input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
