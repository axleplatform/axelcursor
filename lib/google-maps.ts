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

// Load Google Maps API (only core and geometry for maps, no places needed for new API)
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
        libraries: ['geometry'] // Only need geometry for maps, not places
      });

      googleMapsInstance = await loader.load();
      console.log('✅ Google Maps loaded successfully (Core + Geometry)');
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

// Generate session token for new Places API
function generateSessionToken(): string {
  // Generate a UUID-like string for session token
  // This follows Google's recommendation for session tokens
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const uuidPart = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  return `${timestamp}-${randomPart}-${uuidPart}`;
}

// Alternative: Use crypto.randomUUID if available (more secure)
function generateSecureSessionToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateSessionToken();
}

// New Places API autocomplete using HTTP POST
export async function searchPlacesNew(input: string, sessionToken: string): Promise<any> {
  try {
    const apiKey = await getGoogleMapsApiKey();
    
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
        includedPrimaryTypes: ["address", "establishment"],
        includedRegionCodes: ["us"],
        sessionToken: sessionToken,
        languageCode: "en"
      })
    });

    if (!response.ok) {
      throw new Error(`Places API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📍 New Places API response:', data);
    return data;
  } catch (error) {
    console.error('New Places API search failed:', error);
    throw error;
  }
}

// Get place details using new Places API
export async function getPlaceDetailsNew(placeId: string, sessionToken: string): Promise<any> {
  try {
    const apiKey = await getGoogleMapsApiKey();
    
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?sessionToken=${sessionToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents'
      }
    });

    if (!response.ok) {
      throw new Error(`Place details request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📍 Place details response:', data);
    return data;
  } catch (error) {
    console.error('Place details request failed:', error);
    throw error;
  }
}

// Create autocomplete using new Places API
export async function createNewPlacesAutocomplete(
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
    let sessionToken = generateSecureSessionToken();
    let currentSuggestions: any[] = [];
    
    // Create suggestions container
    const createSuggestionsContainer = () => {
      if (suggestionsContainer) {
        suggestionsContainer.remove();
      }
      
      suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'places-autocomplete-suggestions';
      suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        max-height: 200px;
        overflow-y: auto;
        z-index: 9999;
        display: none;
        margin-top: 2px;
      `;
      
      inputElement.parentElement?.appendChild(suggestionsContainer);
    };
    
    // Show suggestions
    const showSuggestions = (suggestions: any[]) => {
      if (!suggestionsContainer) {
        createSuggestionsContainer();
      }
      
      suggestionsContainer!.innerHTML = '';
      currentSuggestions = suggestions;
      
      if (suggestions.length === 0) {
        suggestionsContainer!.style.display = 'none';
        return;
      }
      
      suggestions.forEach((suggestion, index) => {
        const placePrediction = suggestion.placePrediction;
        if (!placePrediction) return;
        
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        // Create icon
        const icon = document.createElement('span');
        // Check if it's an establishment based on place types or text content
        const isEstablishment = placePrediction.types?.some((type: string) => 
          type.includes('establishment') || type.includes('business')
        ) || placePrediction.text?.text?.includes('St') === false;
        icon.textContent = isEstablishment ? '🏢' : '📍';
        icon.style.fontSize = '16px';
        
        // Create text content
        const text = document.createElement('span');
        text.textContent = placePrediction.text?.text || '';
        
        item.appendChild(icon);
        item.appendChild(text);
        
        item.addEventListener('click', async () => {
          try {
            // Get place details
            const placeDetails = await getPlaceDetailsNew(placePrediction.placeId, sessionToken);
            
            // Format place data to match expected structure
            const formattedPlace = {
              place_id: placePrediction.placeId,
              formatted_address: placeDetails.formattedAddress || placePrediction.text?.text || '',
              geometry: {
                location: {
                  lat: placeDetails.location?.latitude || 0,
                  lng: placeDetails.location?.longitude || 0
                }
              },
              address_components: placeDetails.addressComponents || [],
              displayName: placeDetails.displayName,
              types: placePrediction.types
            };
            
            inputElement.value = formattedPlace.formatted_address;
            suggestionsContainer!.style.display = 'none';
            onPlaceSelect(formattedPlace);
            
            // Generate new session token for next search
            sessionToken = generateSecureSessionToken();
          } catch (error) {
            console.error('Failed to get place details:', error);
            // Fallback to basic selection
            inputElement.value = placePrediction.text?.text || '';
            suggestionsContainer!.style.display = 'none';
            onPlaceSelect({
              place_id: placePrediction.placeId,
              formatted_address: placePrediction.text?.text || '',
              geometry: { location: { lat: 0, lng: 0 } }
            });
          }
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
          const data = await searchPlacesNew(query, sessionToken);
          
          if (data.suggestions && Array.isArray(data.suggestions)) {
            showSuggestions(data.suggestions.slice(0, 5)); // Limit to 5 suggestions
          } else {
            console.warn('No suggestions in response:', data);
            showSuggestions([]);
          }
        } catch (error) {
          console.error('Failed to search places:', error);
          showSuggestions([]);
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
    
    // Handle keyboard navigation
    inputElement.addEventListener('keydown', (e) => {
      if (!suggestionsContainer || suggestionsContainer.style.display === 'none') return;
      
      const items = suggestionsContainer.querySelectorAll('.suggestion-item');
      const currentIndex = Array.from(items).findIndex(item => item.style.backgroundColor === 'rgb(249, 250, 251)');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex]?.style.removeProperty('background-color');
            items[currentIndex + 1].style.backgroundColor = '#f9fafb';
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex]?.style.removeProperty('background-color');
            items[currentIndex - 1].style.backgroundColor = '#f9fafb';
          }
          break;
        case 'Enter':
          e.preventDefault();
          const selectedItem = suggestionsContainer.querySelector('.suggestion-item[style*="background-color: rgb(249, 250, 251)"]');
          if (selectedItem) {
            selectedItem.dispatchEvent(new Event('click'));
          }
          break;
        case 'Escape':
          suggestionsContainer.style.display = 'none';
          break;
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
      sessionToken,
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
    
    console.log('✅ New Places API autocomplete initialized successfully');
    return { success: true, autocomplete: instance };
    
  } catch (error) {
    console.error('Failed to create new Places API autocomplete:', error);
    return { success: false, error: error.message };
  }
}

// Legacy function for backward compatibility
export async function createAutocomplete(
  inputElement: HTMLInputElement,
  onPlaceSelect: (place: any) => void,
  options: any = {}
): Promise<any> {
  return createNewPlacesAutocomplete(inputElement, onPlaceSelect, options);
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
