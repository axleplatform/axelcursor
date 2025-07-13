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

// Load Google Maps API (only core and geocoding, no places)
export async function loadGoogleMaps(): Promise<any> {
  if (googleMapsInstance) {
    return googleMapsInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const apiKey = await getGoogleMapsApiKey();
      
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['geometry'] // Remove 'places' since we're not using it
      });

      googleMapsInstance = await loader.load();
      console.log('✅ Google Maps loaded successfully (Geocoding only)');
      return googleMapsInstance;
    } catch (error) {
      console.error('❌ Failed to load Google Maps:', error);
      throw error;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// Simple address search using Geocoding API (no Places API needed)
export async function searchAddresses(query: string): Promise<any[]> {
  try {
    const apiKey = await getGoogleMapsApiKey();
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=country:us`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results.map((result: any) => ({
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          }
        },
        address_components: result.address_components
      }));
    } else {
      console.warn('Geocoding API returned status:', data.status);
      return [];
    }
  } catch (error) {
    console.error('Address search failed:', error);
    return [];
  }
}

// Create simple autocomplete using Geocoding API
export async function createSimpleAutocomplete(
  inputElement: HTMLInputElement,
  onPlaceSelect: (place: any) => void,
  options: any = {}
): Promise<any> {
  try {
    // Check if element is still valid
    if (!inputElement || !inputElement.isConnected) {
      throw new Error('Input element is not connected to DOM');
    }
    
    let searchTimeout: NodeJS.Timeout | null = null;
    let suggestionsContainer: HTMLDivElement | null = null;
    
    // Create suggestions container
    const createSuggestionsContainer = () => {
      if (suggestionsContainer) {
        suggestionsContainer.remove();
      }
      
      suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'address-suggestions';
      suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        max-height: 200px;
        overflow-y: auto;
        z-index: 9999;
        display: none;
      `;
      
      inputElement.parentElement?.appendChild(suggestionsContainer);
    };
    
    // Show suggestions
    const showSuggestions = (suggestions: any[]) => {
      if (!suggestionsContainer) {
        createSuggestionsContainer();
      }
      
      suggestionsContainer!.innerHTML = '';
      
      if (suggestions.length === 0) {
        suggestionsContainer!.style.display = 'none';
        return;
      }
      
      suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        `;
        item.textContent = suggestion.formatted_address;
        
        item.addEventListener('click', () => {
          inputElement.value = suggestion.formatted_address;
          suggestionsContainer!.style.display = 'none';
          onPlaceSelect(suggestion);
        });
        
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = '#f9fafb';
        });
        
        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = 'white';
        });
        
        suggestionsContainer!.appendChild(item);
      });
      
      suggestionsContainer!.style.display = 'block';
    };
    
    // Handle input changes with debouncing
    const handleInputChange = async (e: Event) => {
      const query = (e.target as HTMLInputElement).value.trim();
      
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      if (query.length < 3) {
        if (suggestionsContainer) {
          suggestionsContainer.style.display = 'none';
        }
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        try {
          const suggestions = await searchAddresses(query);
          showSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
        } catch (error) {
          console.error('Failed to search addresses:', error);
        }
      }, 300); // 300ms debounce
    };
    
    // Add event listeners
    inputElement.addEventListener('input', handleInputChange);
    inputElement.addEventListener('focus', () => {
      if (suggestionsContainer && suggestionsContainer.children.length > 0) {
        suggestionsContainer.style.display = 'block';
      }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (suggestionsContainer && !inputElement.contains(e.target as Node) && !suggestionsContainer.contains(e.target as Node)) {
        suggestionsContainer.style.display = 'none';
      }
    });
    
    // Track instance for cleanup
    const instance = {
      inputElement,
      suggestionsContainer,
      searchTimeout,
      cleanup: () => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        if (suggestionsContainer) {
          suggestionsContainer.remove();
        }
        inputElement.removeEventListener('input', handleInputChange);
      }
    };
    
    autocompleteInstances.set(inputElement, instance);
    
    console.log('✅ Simple autocomplete initialized successfully');
    return { success: true, autocomplete: instance };
    
  } catch (error) {
    console.error('Failed to create simple autocomplete:', error);
    return { success: false, error: error.message };
  }
}

// Legacy function for backward compatibility
export async function createAutocomplete(
  inputElement: HTMLInputElement,
  onPlaceSelect: (place: any) => void,
  options: any = {}
): Promise<any> {
  return createSimpleAutocomplete(inputElement, onPlaceSelect, options);
}

// Cleanup autocomplete safely
export function cleanupAutocomplete(autocomplete: any): void {
  try {
    if (autocomplete && typeof autocomplete.cleanup === 'function') {
      autocomplete.cleanup();
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
    
    console.log('✅ Google Maps cleanup completed');
  } catch (error) {
    console.warn('Error during Google Maps cleanup:', error);
  }
}
