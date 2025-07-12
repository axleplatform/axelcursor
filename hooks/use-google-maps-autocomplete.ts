// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { createSafeAutocomplete, cleanupAutocomplete } from '@/lib/google-maps';

interface UseGoogleMapsAutocompleteOptions {
  onPlaceSelect?: (place: any) => void;
  onInputChange?: (value: string) => void;
  options?: any;
  disabled?: boolean;
}

interface UseGoogleMapsAutocompleteReturn {
  inputRef: React.RefObject<HTMLInputElement>;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export function useGoogleMapsAutocomplete({
  onPlaceSelect,
  onInputChange,
  options = {},
  disabled = false
}: UseGoogleMapsAutocompleteOptions): UseGoogleMapsAutocompleteReturn {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize autocomplete
  const initializeAutocomplete = useCallback(async () => {
    if (!inputRef.current || disabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Wait for the next tick to ensure the ref is properly attached
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify it's actually an HTMLInputElement
      if (!(inputRef.current instanceof HTMLInputElement)) {
        throw new Error('Ref is not an HTMLInputElement');
      }

      // Create safe autocomplete with dedicated container
      const autocomplete = await createSafeAutocomplete(inputRef.current, {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'geometry', 'formatted_address', 'place_id'],
        ...options
      });

      autocompleteRef.current = autocomplete;

      // Add place_changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && onPlaceSelect) {
          onPlaceSelect(place);
        }
      });

      setIsLoaded(true);
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize autocomplete');
    } finally {
      setIsLoading(false);
    }
  }, [onPlaceSelect, options, disabled]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onInputChange) {
      onInputChange(e.target.value);
    }
  }, [onInputChange]);

  // Initialize on mount
  useEffect(() => {
    initializeAutocomplete();
  }, [initializeAutocomplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        cleanupAutocomplete(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Add input change listener
  useEffect(() => {
    const input = inputRef.current;
    if (input && onInputChange) {
      input.addEventListener('input', handleInputChange as any);
      return () => {
        input.removeEventListener('input', handleInputChange as any);
      };
    }
  }, [handleInputChange, onInputChange]);

  return {
    inputRef,
    isLoading,
    isLoaded,
    error
  };
} 