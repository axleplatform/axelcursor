// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react'

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: any) => void
  placeholder?: string
  className?: string
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Enter your address",
  className = ""
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const initAutocomplete = async () => {
      // Wait for Google Maps to load
      if (!window.google?.maps?.places) {
        if (mounted) {
          setTimeout(initAutocomplete, 100);
        }
        return;
      }

      // Wait for the next tick to ensure the ref is properly attached
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check if container still exists
      if (!mounted || !inputRef.current || !inputRef.current.isConnected) {
        console.log('Input ref not available, not connected, or component unmounted');
        return;
      }

      // Verify it's actually an HTMLInputElement
      if (!(inputRef.current instanceof HTMLInputElement)) {
        console.error('Ref is not an HTMLInputElement:', inputRef.current);
        return;
      }

      try {
        setIsLoading(true);

        // Use traditional Autocomplete instead of PlaceAutocompleteElement
        autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
        });

        autocompleteInstance.addListener('place_changed', () => {
          if (mounted) {
            const place = autocompleteInstance.getPlace();
            if (place.geometry) {
              onPlaceSelect(place);
            }
          }
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Autocomplete init error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAutocomplete();

    // Cleanup
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
  }, [onPlaceSelect, placeholder]);

  return (
    <div className={`google-places-container ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  )
}
