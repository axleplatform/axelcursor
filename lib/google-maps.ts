import { Loader } from '@googlemaps/js-api-loader'

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.')
}

// Initialize Google Maps loader
export const googleMapsLoader = new Loader({
  apiKey: GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places', 'geometry']
})

// Load Google Maps API
export async function loadGoogleMaps(): Promise<typeof google> {
  try {
    return await googleMapsLoader.load()
  } catch (error) {
    console.error('Failed to load Google Maps API:', error)
    throw error
  }
}

// Geocoding utility functions
export async function geocodeAddress(address: string): Promise<google.maps.GeocoderResult[]> {
  const google = await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results) {
        resolve(results)
      } else {
        reject(new Error(`Geocoding failed: ${status}`))
      }
    })
  })
}

// Reverse geocoding utility functions
export async function reverseGeocode(lat: number, lng: number): Promise<google.maps.GeocoderResult[]> {
  const google = await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results) {
        resolve(results)
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`))
      }
    })
  })
}

// Calculate distance between two points
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format address from geocoding result
export function formatAddress(result: google.maps.GeocoderResult): string {
  const addressComponents = result.address_components
  const streetNumber = addressComponents.find(component => 
    component.types.includes('street_number')
  )?.long_name || ''
  
  const route = addressComponents.find(component => 
    component.types.includes('route')
  )?.long_name || ''
  
  const locality = addressComponents.find(component => 
    component.types.includes('locality')
  )?.long_name || ''
  
  const administrativeArea = addressComponents.find(component => 
    component.types.includes('administrative_area_level_1')
  )?.short_name || ''
  
  const postalCode = addressComponents.find(component => 
    component.types.includes('postal_code')
  )?.long_name || ''
  
  return `${streetNumber} ${route}, ${locality}, ${administrativeArea} ${postalCode}`.trim()
}

// Extract coordinates from geocoding result
export function extractCoordinates(result: google.maps.GeocoderResult): { lat: number; lng: number } {
  const location = result.geometry.location
  return {
    lat: location.lat(),
    lng: location.lng()
  }
} 