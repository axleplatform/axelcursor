// @ts-nocheck
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createSafeAutocomplete, safeCleanupAutocomplete } from '@/lib/google-maps';

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
  const initializationAttempted = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    componentRestrictions: { country: 'us' },
    fields: ['address_components', 'geometry', 'formatted_address', 'place_id'],
    ...options
  }), [options]);

  // Initialize autocomplete with better timing
  const initializeAutocomplete = useCallback(async () => {
    if (!inputRef.current || disabled || initializationAttempted.current) return;

    try {
      setIsLoading(true);
      setError(null);
      initializationAttempted.current = true;

      // Wait for the next tick to ensure the ref is properly attached
      await new Promise(resolve => setTimeout(resolve, 100));

      // Double-check ref is still valid and connected
      if (!inputRef.current || !inputRef.current.isConnected) {
        console.log('Input ref not available or not connected');
        initializationAttempted.current = false;
        return;
      }

      // Verify it's actually an HTMLInputElement
      if (!(inputRef.current instanceof HTMLInputElement)) {
        console.log('Ref is not an HTMLInputElement, skipping initialization');
        initializationAttempted.current = false;
        return;
      }

      // Clean up any existing Google Maps elements before initialization
      const existingElements = document.querySelectorAll('.pac-container, .pac-item');
      existingElements.forEach(el => {
        try {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      });

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
      initializationAttempted.current = false;
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

  // Initialize on mount with better timing
  useEffect(() => {
    // Use a longer delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      initializeAutocomplete();
    }, 200);

    return () => clearTimeout(timer);
  }, [initializeAutocomplete]);

  // Improved cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending initialization
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Delay cleanup to avoid conflicts with React's DOM management
      cleanupTimeoutRef.current = setTimeout(() => {
        if (autocompleteRef.current) {
          try {
            safeCleanupAutocomplete(autocompleteRef.current);
          } catch (error) {
            console.warn('Error during autocomplete cleanup:', error);
          }
          autocompleteRef.current = null;
        }
        initializationAttempted.current = false;
      }, 100);
    };
  }, []);

  // Add input change listener with better cleanup
  useEffect(() => {
    const input = inputRef.current;
    if (input && onInputChange) {
      const handleInput = handleInputChange as any;
      input.addEventListener('input', handleInput);
      return () => {
        if (input && input.isConnected) {
          input.removeEventListener('input', handleInput);
        }
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