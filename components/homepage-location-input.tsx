// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import { Input } from "@/components/ui/input"

interface HomepageLocationInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onLocationSelect: (loc: any) => void;
  label?: string;     // ➊ add
  required?: boolean; // ➋ add
}

export default function HomepageLocationInput({
  value,
  onChange,
  onLocationSelect,
  label,        // ➌ use if you like
  required      // ➍ use if you like
}: HomepageLocationInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)

  useEffect(() => {
    let mounted = true;
    let autocompleteInstance: any = null;

    const container = containerRef.current;
    if (!container) return;

    // Only clear if container is empty
    if (container.isConnected && mounted && container.childNodes.length === 0) {
      container.innerHTML = '';
    }

    // Create input and append using innerHTML to avoid DOM conflicts
    const inputHTML = `
      <input 
        type="text" 
        placeholder="Enter your location" 
        class="pl-10 w-full h-12 border rounded-md bg-gray-50 px-3 text-sm"
        value="${value || ''}"
      />
    `;
    container.innerHTML = inputHTML;
    const input = container.querySelector('input');
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

        // Replace the input with the autocomplete element using innerHTML only
        if (mounted && container && container.isConnected) {
          // Only clear if container is empty
          if (container.childNodes.length === 0) {
            container.innerHTML = '';
          }
          container.appendChild(autocompleteInstance);
          setAutocomplete(autocompleteInstance);
        }
      } catch (error) {
        console.error('Error loading autocomplete:', error);
      }
    };

    loadAutocomplete();

    return () => {
      mounted = false;
      // Remove autocompleteInstance if present
      if (containerRef.current && containerRef.current.isConnected && autocompleteInstance) {
        try {
          if (containerRef.current.contains(autocompleteInstance)) {
            containerRef.current.removeChild(autocompleteInstance);
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

  // Keep value in sync
  useEffect(() => {
    if (autocomplete && value !== undefined) {
      autocomplete.value = value
    }
  }, [autocomplete, value])

  return (
    <div className="mb-3">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative" ref={containerRef} />
    </div>
  )
}
