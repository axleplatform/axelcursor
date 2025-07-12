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
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

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

      // Check if container still exists
      if (!mounted || !containerRef.current || !containerRef.current.isConnected) return;

      try {
        // Clear container first
        containerRef.current.innerHTML = '';

        // Try new API first
        if (window.google.maps.places.PlaceAutocompleteElement) {
          autocompleteInstance = new window.google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: 'us' }
          });
          
          // Add to container using innerHTML only to avoid DOM conflicts
          containerRef.current.innerHTML = '';
          const autocompleteHTML = autocompleteInstance.outerHTML || '';
          containerRef.current.innerHTML = autocompleteHTML;
          
          // Add placeholder
          const input = autocompleteInstance.querySelector('input');
          if (input) {
            input.placeholder = placeholder;
          }

          // Handle selection
          autocompleteInstance.addEventListener('gmp-placeselect', (event: any) => {
            if (mounted && event.place) {
              onPlaceSelect(event.place);
            }
          });
        } else {
          // Fallback to input field using innerHTML
          const inputHTML = `
            <input 
              type="text" 
              placeholder="${placeholder}" 
              class="w-full px-3 py-2 border rounded-lg"
            />
          `;
          containerRef.current.innerHTML = inputHTML;
          const input = containerRef.current.querySelector('input');

          // Use old autocomplete
          autocompleteInstance = new window.google.maps.places.Autocomplete(input, {
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
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Autocomplete init error:', error);
        // Show fallback input
        if (containerRef.current && mounted && containerRef.current.isConnected) {
          containerRef.current.innerHTML = `
            <input 
              type="text" 
              placeholder="${placeholder}" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          `;
        }
      }
    };

    initAutocomplete();

    // Cleanup
    return () => {
      mounted = false;
      // Only clear if container still exists and is connected
      if (containerRef.current && containerRef.current.isConnected) {
        try {
          containerRef.current.innerHTML = '';
        } catch (e) {
          console.error('Cleanup innerHTML error:', e);
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
  }, [onPlaceSelect, placeholder]);

  return (
    <div ref={containerRef} className={`google-places-container ${className}`}>
      {!isLoaded && (
        <input
          type="text"
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      )}
    </div>
  )
}
