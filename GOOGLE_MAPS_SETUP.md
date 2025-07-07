# Google Maps API Integration Setup Guide

This guide will help you implement Google Maps API in your mechanic booking platform.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @googlemaps/js-api-loader @types/google.maps
```

### 2. Set Environment Variables

Create or update your `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

## 📁 Files Created

### Core Configuration
- `lib/google-maps.ts` - Google Maps API configuration and utility functions
- `components/google-maps-map.tsx` - Reusable map component
- `components/location-input.tsx` - Location input with autocomplete
- `components/appointment-location-map.tsx` - Simple map for displaying locations
- `components/homepage-location-input.tsx` - Homepage-specific location input

### Configuration Updates
- `next.config.mjs` - Updated with CSP headers for Google Maps domains

## 🎯 Usage Examples

### 1. Basic Map Display

```tsx
import GoogleMapsMap from '@/components/google-maps-map'

<GoogleMapsMap
  center={{ lat: 37.7749, lng: -122.4194 }}
  height="400px"
  showMarker={true}
/>
```

### 2. Interactive Location Selection

```tsx
import LocationInput from '@/components/location-input'

<LocationInput
  value={address}
  onChange={setAddress}
  onLocationSelect={(location) => {
    console.log('Selected:', location.lat, location.lng, location.address)
  }}
  showMap={true}
  mapHeight="300px"
/>
```

### 3. Display Appointment Location

```tsx
import AppointmentLocationMap from '@/components/appointment-location-map'

<AppointmentLocationMap
  address="123 Main St, San Francisco, CA"
  height="200px"
  showMarker={true}
/>
```

## 🔧 Integration Points

### 1. Homepage (`app/page.tsx`)
Replace the existing location input with:
```tsx
import HomepageLocationInput from '@/components/homepage-location-input'

<HomepageLocationInput
  value={formData.address}
  onChange={(value) => setFormData({ ...formData, address: value })}
  error={errors.address}
  onLocationSelect={(location) => {
    // Store coordinates for distance calculations
    setSelectedLocation(location)
  }}
/>
```

### 2. Mechanic Onboarding (`app/onboarding-mechanic-2/page.tsx`)
Replace the address input with:
```tsx
import LocationInput from '@/components/location-input'

<LocationInput
  value={formData.locationAddress}
  onChange={(value) => setFormData({ ...formData, locationAddress: value })}
  error={validationErrors.locationAddress}
  label="Location address"
  required={true}
  showMap={true}
  mapHeight="250px"
/>
```

### 3. Mechanic Dashboard (`app/mechanic/dashboard/page.tsx`)
Add map display for appointments:
```tsx
import AppointmentLocationMap from '@/components/appointment-location-map'

// In appointment card
<AppointmentLocationMap
  address={appointment.location}
  height="150px"
  showMarker={true}
/>
```

## 🛠️ Utility Functions

### Geocoding
```tsx
import { geocodeAddress, reverseGeocode } from '@/lib/google-maps'

// Convert address to coordinates
const results = await geocodeAddress("123 Main St, San Francisco, CA")
const coordinates = extractCoordinates(results[0])

// Convert coordinates to address
const results = await reverseGeocode(37.7749, -122.4194)
const address = formatAddress(results[0])
```

### Distance Calculation
```tsx
import { calculateDistance } from '@/lib/google-maps'

const distance = calculateDistance(lat1, lng1, lat2, lng2) // Returns miles
```

## 🔒 Security Considerations

1. **API Key Restrictions**: Restrict your API key to:
   - Your domain (e.g., `yourdomain.com`)
   - Specific APIs (Maps JavaScript, Places, Geocoding)
   - HTTP referrers

2. **CSP Headers**: Already configured in `next.config.mjs`

3. **Rate Limiting**: Monitor API usage in Google Cloud Console

## 🎨 Customization

### Map Styling
Customize map appearance in `google-maps-map.tsx`:
```tsx
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
  // Add more custom styles
]
```

### Marker Icons
Replace the SVG marker in components:
```tsx
icon: {
  url: 'path/to/your/marker.svg',
  scaledSize: new google.maps.Size(24, 24),
  anchor: new google.maps.Point(12, 24)
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"Google Maps API key not found"**
   - Check environment variable name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Restart development server after adding env var

2. **"Failed to load map"**
   - Verify API key is valid
   - Check API is enabled in Google Cloud Console
   - Ensure billing is set up

3. **Autocomplete not working**
   - Verify Places API is enabled
   - Check API key restrictions

4. **CSP errors**
   - Check browser console for blocked resources
   - Update CSP headers in `next.config.mjs`

### Debug Mode
Add to your environment:
```env
NEXT_PUBLIC_GOOGLE_MAPS_DEBUG=true
```

## 📊 Performance Optimization

1. **Lazy Loading**: Maps are loaded dynamically to avoid SSR issues
2. **Caching**: Consider caching geocoding results
3. **Debouncing**: Implement debouncing for autocomplete inputs

## 🔄 Next Steps

1. Install dependencies
2. Add your API key to environment variables
3. Test basic map functionality
4. Integrate into existing pages
5. Add distance calculations for mechanic matching
6. Implement location-based search features

## 📞 Support

For Google Maps API issues:
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Maps API Support](https://developers.google.com/maps/support) 