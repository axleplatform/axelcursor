// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react'

interface MechanicLocationInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  label?: string
  required?: boolean
}

// Define the event type for the new PlaceAutocompleteElement
interface PlaceSelectEvent {
  place: any
}

export default function MechanicLocationInput({
  value,
  onChange,
  error,
  onLocationSelect,
  label = "Location address",
  required = false
}: MechanicLocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const initializeAutocomplete = async () => {
      if (!inputRef.current || !mounted || !inputRef.current.isConnected) return;

      try {
        setIsLoading(true);
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        const google = await loadGoogleMaps();

        // Create autocomplete element using new API
        autocompleteInstance = new google.maps.places.PlaceAutocompleteElement({ 
          componentRestrictions: { country: 'us' } 
        });
        
        // Configure the autocomplete element
        autocompleteInstance.setAttribute('placeholder', 'Enter your full address');
        autocompleteInstance.setAttribute('types', 'address');
        autocompleteInstance.setAttribute('component-restrictions', 'us');
        autocompleteInstance.setAttribute('fields', 'address_components,geometry,formatted_address');

        // Handle place selection
        autocompleteInstance.addEventListener('gmp-placeselect', (event: any) => {
          if (!mounted) return;
          const place = event.place;
          
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || value;

            onChange(address);

            if (onLocationSelect) {
              onLocationSelect({ lat, lng, address });
            }
          }
        });

        // Replace the container with the autocomplete element using innerHTML only
        if (mounted && inputRef.current && inputRef.current.isConnected) {
          // Only clear if container is empty
          if (inputRef.current.childNodes.length === 0) {
            inputRef.current.innerHTML = '';
          }
          inputRef.current.appendChild(autocompleteInstance);
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
      // Remove autocompleteInstance if present
      if (inputRef.current && inputRef.current.isConnected && autocompleteInstance) {
        try {
          if (inputRef.current.contains(autocompleteInstance)) {
            inputRef.current.removeChild(autocompleteInstance);
          }
        } catch (e) {
          console.error('Cleanup removeChild error:', e);
        }
      }
      // Remove all listeners from autocompleteInstance if needed
      if (autocompleteInstance) {
        try {
          if ((window as any).google && (window as any).google.maps && (window as any).google.maps.event) {
            (window as any).google.maps.event.clearInstanceListeners(autocompleteInstance);
          }
        } catch (e) {
          console.error('Cleanup clearInstanceListeners error:', e);
        }
      }
    };
  }, [onChange, onLocationSelect, value]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div>
      <label htmlFor="locationAddress" className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <span className="text-lg sm:text-xl lg:text-2xl leading-none text-[#294a46] inline-flex items-center justify-center">📍</span>
          )}
        </div>
        {/* Dedicated container that React never touches after initial render */}
        <div 
          ref={inputRef}
          className={`pl-10 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10 ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        This will be used as your base location for service requests. Start typing to see address suggestions.
      </p>
    </div>
  )
}
