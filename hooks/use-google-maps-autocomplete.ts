// @ts-nocheck
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    componentRestrictions: { country: 'us' },
    fields: ['address_components', 'geometry', 'formatted_address', 'place_id'],
    ...options
  }), [options]);

  // Initialize autocomplete
  const initializeAutocomplete = useCallback(async () => {
    if (!inputRef.current || disabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Wait for the next tick to ensure the ref is properly attached
      await new Promise(resolve => setTimeout(resolve, 50));

      // Double-check ref is still valid
      if (!inputRef.current || !inputRef.current.isConnected) {
        console.log('Input ref not available or not connected');
        return;
      }

      // Verify it's actually an HTMLInputElement
      if (!(inputRef.current instanceof HTMLInputElement)) {
        console.log('Ref is not an HTMLInputElement, waiting...');
        // Try again after a short delay
        setTimeout(() => {
          if (inputRef.current && inputRef.current instanceof HTMLInputElement) {
            initializeAutocomplete();
          }
        }, 100);
        return;
      }

      // Create safe autocomplete without container
      const autocomplete = await createSafeAutocomplete(inputRef.current, memoizedOptions);

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
  }, [disabled, memoizedOptions, onPlaceSelect]);

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

  // Cleanup on unmount with delay to avoid DOM conflicts
  useEffect(() => {
    return () => {
      // Delay cleanup to avoid conflicts with React's DOM management
      setTimeout(() => {
        if (autocompleteRef.current) {
          try {
            cleanupAutocomplete(autocompleteRef.current);
          } catch (error) {
            console.warn('Error during autocomplete cleanup:', error);
          }
          autocompleteRef.current = null;
        }
      }, 0);
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