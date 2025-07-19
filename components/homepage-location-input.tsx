// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from 'lucide-react'
import { cleanupAllAutocompleteInstances } from '@/lib/google-maps'

interface HomepageLocationInputProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (place: any) => void
  onFocus?: () => void
  label?: string
  required?: boolean
}

export default function HomepageLocationInput({
  value,
  onChange,
  onLocationSelect,
  onFocus,
  label,
  required
}: HomepageLocationInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
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
      try {
        console.log('🔍 HomepageLocationInput: Cleaning up autocomplete');
        cleanupAllAutocompleteInstances();
        autocompleteRef.current = null;
      } catch (error) {
        console.warn('Error during autocomplete cleanup:', error);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsGpsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Store coordinates directly
      const coordinates = `${latitude}, ${longitude}`;
      onChange(coordinates);
      console.log('📍 GPS coordinates set:', coordinates);
    } catch (locationError) {
      console.error('Geolocation error:', locationError);
      setError('Could not get your current location. Please check your browser permissions.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative location-input-wrapper">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ zIndex: 15 }}>
          {isGpsLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  console.log('📍 GPS button clicked!');
                  getCurrentLocation();
                }}
                disabled={isGpsLoading}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 cursor-pointer p-1 rounded hover:bg-gray-100 hover:scale-110"
                title="Click for exact coordinates"
              >
                <span className="text-lg">📍</span>
              </button>
            </div>
          )}
        </div>
        <Input
          ref={inputRef}
          id="location-input"
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={onFocus}
          placeholder="Click Pin or Enter Address"
          className="location-input w-full h-[50px] pl-12 pr-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-300 focus:shadow-none transition-none"
          style={{
            paddingLeft: '3rem',
            background: 'linear-gradient(to right, transparent 3rem, white 3rem)'
          }}
          required={required}
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
