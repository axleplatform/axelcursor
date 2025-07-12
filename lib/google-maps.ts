// @ts-nocheck
import { Loader } from '@googlemaps/js-api-loader'

// Global state management
let cachedApiKey: string | null = null;
let googleMapsInstance: any = null;
let loadingPromise: Promise<any> | null = null;
let autocompleteContainers = new Set<HTMLElement>();

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

// Safe autocomplete initialization with dedicated container
export async function createSafeAutocomplete(
  inputElement: HTMLInputElement,
  options: any = {}
): Promise<any> {
  const google = await loadGoogleMaps();
  
  // Create a dedicated container for the autocomplete dropdown
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.zIndex = '1000';
  container.style.width = '100%';
  container.style.top = '100%';
  container.style.left = '0';
  
  // Insert container after the input
  inputElement.parentElement?.appendChild(container);
  
  // Create autocomplete with container
  const autocomplete = new google.maps.places.Autocomplete(inputElement, {
    ...options,
    container: container
  });
  
  // Track container for cleanup
  autocompleteContainers.add(container);
  
  return autocomplete;
}

// Cleanup autocomplete and its container
export function cleanupAutocomplete(autocomplete: any): void {
  try {
    // Clear all listeners
    if (window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    }
    
    // Remove container from DOM
    const container = autocomplete.getContainer?.();
    if (container && container.parentElement) {
      container.parentElement.removeChild(container);
      autocompleteContainers.delete(container);
    }
  } catch (error) {
    console.warn('Error during autocomplete cleanup:', error);
  }
}

// Cleanup all autocomplete containers
export function cleanupAllAutocompleteContainers(): void {
  autocompleteContainers.forEach(container => {
    try {
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }
    } catch (error) {
      console.warn('Error removing autocomplete container:', error);
    }
  });
  autocompleteContainers.clear();
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
  cleanupAllAutocompleteContainers();
}
