// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const initializeAutocomplete = async () => {
      // Wait for the next tick to ensure the ref is properly attached
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!inputRef.current || !mounted) {
        console.log('Input ref not available or component unmounted');
        return;
      }

      // Verify it's actually an HTMLInputElement
      if (!(inputRef.current instanceof HTMLInputElement)) {
        console.error('Ref is not an HTMLInputElement:', inputRef.current);
        return;
      }

      try {
        setIsLoading(true);
        
        // Dynamic import to avoid SSR issues
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        const google = await loadGoogleMaps();

        // Use traditional Autocomplete instead of PlaceAutocompleteElement
        autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
        });

        autocompleteInstance.addListener('place_changed', () => {
          if (!mounted) return;
          const place = autocompleteInstance.getPlace();
          if (place.geometry) {
            const address = place.formatted_address || '';
            if (onChange) onChange(address);
            if (onLocationSelect) onLocationSelect(place);
          }
        });

        setAutocomplete(autocompleteInstance);
      } catch (error) {
        console.error('Error loading autocomplete:', error);
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
          if ((window as any).google && (window as any).google.maps && (window as any).google.maps.event) {
            (window as any).google.maps.event.clearInstanceListeners(autocompleteInstance);
          }
        } catch (e) {
          console.error('Cleanup clearInstanceListeners error:', e);
        }
      }
    };
  }, [onChange, onLocationSelect]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your location"
          className="pl-10"
        />
      </div>
    </div>
  )
}
