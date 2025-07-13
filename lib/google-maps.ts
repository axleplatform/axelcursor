// @ts-nocheck
import { Loader } from '@googlemaps/js-api-loader'

// Global state management
let cachedApiKey: string | null = null;
let googleMapsInstance: any = null;
let loadingPromise: Promise<any> | null = null;
let autocompleteInstances = new Map<HTMLElement, any>();

export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  
  try {
    const response = await fetch('/api/maps-config');
    const data = await response.json();
    
    if (!data.apiKey) {
      throw new Error('No API key returned from server');
    }
    
    cachedApiKey = data.apiKey;
    return data.apiKey;
  } catch (error) {
    console.error('Failed to fetch Google Maps API key:', error);
    throw error;
  }
}

// Load Google Maps API only once
export async function loadGoogleMaps(): Promise<any> {
  // Return cached instance if already loaded
  if (googleMapsInstance) {
    return googleMapsInstance;
  }

  // Return existing promise if loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Create new loading promise
  loadingPromise = (async () => {
    try {
      const apiKey = await getGoogleMapsApiKey();
      
      if (!apiKey) {
        throw new Error('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY environment variable.');
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['geometry', 'marker'],
        mapIds: ['DEMO_MAP_ID']
      });

      const google = await loader.load();
      googleMapsInstance = google;
      return google;
    } catch (error) {
      console.error('Failed to load Google Maps API:', error);
      loadingPromise = null; // Reset on error
      throw error;
    }
  })();

  return loadingPromise;
}

// Safe autocomplete initialization with new Places API
export async function createSafeAutocomplete(
  inputElement: HTMLInputElement,
  options: any = {}
): Promise<any> {
  const google = await loadGoogleMaps();
  
  // Check if element is still valid
  if (!inputElement || !inputElement.isConnected) {
    throw new Error('Input element is not connected to DOM');
  }
  
  // Clean up any existing autocomplete on this element
  const existingInstance = autocompleteInstances.get(inputElement);
  if (existingInstance) {
    try {
      safeCleanupAutocomplete(existingInstance);
    } catch (error) {
      console.warn('Error cleaning up existing autocomplete:', error);
    }
  }
  
  // Create autocomplete with the new PlaceAutocompleteElement API
  const autocomplete = new google.maps.places.PlaceAutocompleteElement({
    componentRestrictions: { country: 'us' },
    types: ['address', 'establishment'],
    ...options
  });
  
  // Track instance for cleanup
  autocompleteInstances.set(inputElement, autocomplete);
  
  return autocomplete;
}

// Cleanup autocomplete safely
export function cleanupAutocomplete(autocomplete: any): void {
  try {
    // Clear all listeners
    if (window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    }
    
    // Remove from tracking map
    for (const [element, instance] of autocompleteInstances.entries()) {
      if (instance === autocomplete) {
        autocompleteInstances.delete(element);
        break;
      }
    }
  } catch (error) {
    console.warn('Error during autocomplete cleanup:', error);
  }
}

// Cleanup all autocomplete instances
export function cleanupAllAutocompleteInstances(): void {
  autocompleteInstances.forEach((instance, element) => {
    try {
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(instance);
      }
    } catch (error) {
      console.warn('Error cleaning up autocomplete instance:', error);
    }
  });
  autocompleteInstances.clear();
}

// Enhanced cleanup function with DOM safety checks
export function safeCleanupAutocomplete(autocomplete: any): void {
  try {
    // Check if autocomplete is still valid
    if (!autocomplete || typeof autocomplete !== 'object') {
      return;
    }

    // Clear all listeners safely
    if (window.google?.maps?.event && typeof window.google.maps.event.clearInstanceListeners === 'function') {
      try {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      } catch (listenerError) {
        console.warn('Error clearing autocomplete listeners:', listenerError);
      }
    }
    
    // Remove from tracking map
    for (const [element, instance] of autocompleteInstances.entries()) {
      if (instance === autocomplete) {
        // Check if element is still in DOM before removing
        if (element && element.isConnected) {
          try {
            // Remove any Google Maps DOM elements that might be attached
            const parent = element.parentElement;
            if (parent) {
              const googleElements = parent.querySelectorAll('[data-google-maps-autocomplete]');
              googleElements.forEach(el => {
                try {
                  if (el.parentNode) {
                    el.parentNode.removeChild(el);
                  }
                } catch (domError) {
                  console.warn('Error removing Google Maps DOM element:', domError);
                }
              });
            }
          } catch (domError) {
            console.warn('Error cleaning up DOM elements:', domError);
          }
        }
        autocompleteInstances.delete(element);
        break;
      }
    }
  } catch (error) {
    console.warn('Error during safe autocomplete cleanup:', error);
  }
}

// Geocoding functions
export async function geocodeAddress(address: string): Promise<any[]> {
  const google = await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK && results) {
        resolve(results);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<any[]> {
  const google = await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK && results) {
        resolve(results);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}

export function extractCoordinates(result: any): { lat: number; lng: number } {
  const location = result.geometry.location;
  return {
    lat: location.lat(),
    lng: location.lng()
  };
}

// Format address from geocoding result
export function formatAddress(result: any): string {
  const addressComponents = result.address_components;
  const streetNumber = addressComponents.find((component: any) => 
    component.types.includes('street_number')
  )?.long_name || '';
  
  const route = addressComponents.find((component: any) => 
    component.types.includes('route')
  )?.long_name || '';
  
  const locality = addressComponents.find((component: any) => 
    component.types.includes('locality')
  )?.long_name || '';
  
  const administrativeArea = addressComponents.find((component: any) => 
    component.types.includes('administrative_area_level_1')
  )?.short_name || '';
  
  const postalCode = addressComponents.find((component: any) => 
    component.types.includes('postal_code')
  )?.long_name || '';
  
  return `${streetNumber} ${route}, ${locality}, ${administrativeArea} ${postalCode}`.trim();
}

// Reset global state (useful for testing)
export function resetGoogleMapsState(): void {
  cachedApiKey = null;
  googleMapsInstance = null;
  loadingPromise = null;
  cleanupAllAutocompleteInstances();
}

// Global cleanup function for app-wide cleanup
export function globalCleanup(): void {
  try {
    // Clean up all autocomplete instances
    cleanupAllAutocompleteInstances();
    
    // Clear any Google Maps DOM elements that might be lingering
    const selectors = [
      '.pac-container',
      '[data-google-maps-autocomplete]',
      '.pac-item',
      '.pac-matched',
      '.pac-logo',
      '.pac-query',
      '.pac-item-query',
      '.pac-item-text',
      '.pac-item-index',
      '.pac-item-selected',
      '.pac-item-query',
      '.pac-item-text',
      '.pac-item-index',
      '.pac-item-selected'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        try {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    });
    
    // Also try to remove any elements with Google Maps related classes
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      try {
        const className = el.className || '';
        if (typeof className === 'string' && className.includes('pac-')) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    
    // Reset global state
    cachedApiKey = null;
    googleMapsInstance = null;
    loadingPromise = null;
    
  } catch (error) {
    console.warn('Error during global cleanup:', error);
  }
}

// Add global cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCleanup();
  });
  
  // Also cleanup on page visibility change (for SPA navigation)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Delay cleanup to avoid conflicts
      setTimeout(() => {
        globalCleanup();
      }, 100);
    }
  });
  
  // Periodic cleanup to prevent DOM conflicts
  setInterval(() => {
    try {
      // Only cleanup if page is not visible or if there are Google Maps elements
      if (document.visibilityState === 'hidden' || document.querySelector('.pac-container')) {
        globalCleanup();
      }
    } catch (error) {
      // Ignore periodic cleanup errors
    }
  }, 10000); // Every 10 seconds
}
