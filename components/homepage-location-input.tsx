"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from "@/components/ui/input"

interface HomepageLocationInputProps {
  value?: string
  onChange?: (value: string) => void
  onLocationSelect: (location: any) => void
}

export default function HomepageLocationInput({ value, onChange, onLocationSelect }: HomepageLocationInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)

  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const container = containerRef.current;
    if (!container) return;

    // Clear container before adding anything
    container.innerHTML = '';

    // Create input and append
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter your location';
    input.className = 'pl-10 w-full h-12 border rounded-md bg-gray-50 px-3 text-sm';
    if (value) input.value = value;
    container.appendChild(input);
    inputRef.current = input;

    const loadAutocomplete = async () => {
      if (!mounted) return;
      
      try {
        const { loadGoogleMaps } = await import('@/lib/google-maps');
        const google = await loadGoogleMaps();
        
        autocompleteInstance = new google.maps.places.PlaceAutocompleteElement({ 
          componentRestrictions: { country: 'us' } 
        });
        
        autocompleteInstance.addEventListener('gmp-placeselect', (event: any) => {
          if (!mounted) return;
          const place = event.place;
          if (onChange) onChange(place.formattedAddress || place.displayName || '');
          if (onLocationSelect) onLocationSelect(place);
        });

        // Replace the input with the autocomplete element
        if (mounted && container && input) {
          container.replaceChild(autocompleteInstance, input);
          setAutocomplete(autocompleteInstance);
        }
      } catch (error) {
        console.error('Error loading autocomplete:', error);
      }
    };

    loadAutocomplete();

    return () => {
      mounted = false;
      // Only clear if container still exists
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      // Remove all listeners from autocompleteInstance if needed
      if (autocompleteInstance) {
        try {
          google.maps.event.clearInstanceListeners(autocompleteInstance);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [onChange, onLocationSelect]);

  // Keep value in sync
  useEffect(() => {
    if (autocomplete && value !== undefined) {
      autocomplete.value = value
    }
  }, [autocomplete, value])

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">Enter your location</label>
      <div className="relative" ref={containerRef} />
    </div>
  )
}
