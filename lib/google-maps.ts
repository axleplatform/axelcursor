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
        libraries: ['places', 'geometry']
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

// Safe autocomplete initialization without dedicated container
export async function createSafeAutocomplete(
  inputElement: HTMLInputElement,
  options: any = {}
): Promise<any> {
  const google = await loadGoogleMaps();
  
  // Create autocomplete without container to avoid DOM conflicts
  const autocomplete = new google.maps.places.Autocomplete(inputElement, {
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
