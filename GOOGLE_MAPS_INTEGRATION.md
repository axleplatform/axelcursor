# Safe Google Maps Integration for React

This document outlines the safe, React-friendly pattern for integrating Google Maps and Places Autocomplete without DOM conflicts.

## 🎯 **Problem Solved**

- ❌ **DOM Conflicts**: Google Maps Autocomplete directly manipulates DOM nodes that React manages
- ❌ **Multiple Script Loading**: Each component loads Google Maps independently
- ❌ **Memory Leaks**: Event listeners and DOM nodes not properly cleaned up
- ❌ **Race Conditions**: Components initialize before DOM is ready

## ✅ **Solution Overview**

### **1. Centralized Google Maps Manager**
- Single script loading with caching
- Dedicated containers for autocomplete dropdowns
- Proper cleanup and memory management

### **2. React Hooks Pattern**
- `useGoogleMapsAutocomplete()` - Safe autocomplete integration
- `useGoogleMaps()` - Safe map integration
- Automatic cleanup on component unmount

### **3. No Direct DOM Manipulation**
- All Google Maps operations go through React refs
- Dedicated containers prevent DOM conflicts
- Proper event listener management

## 🚀 **Usage Examples**

### **Autocomplete Input**
\`\`\`tsx
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

function LocationInput() {
  const handlePlaceSelect = (place) => {
    console.log('Selected:', place.formatted_address);
  };

  const { inputRef, isLoading, error } = useGoogleMapsAutocomplete({
    onPlaceSelect: handlePlaceSelect,
    onInputChange: (value) => console.log('Typing:', value)
  });

  return (
    <div className="relative">
      <input
        ref={inputRef}
        placeholder="Enter address"
        disabled={isLoading}
      />
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
\`\`\`

### **Interactive Map**
\`\`\`tsx
import { useGoogleMaps } from '@/hooks/use-google-maps';

function LocationMap() {
  const handleLocationSelect = (location) => {
    console.log('Map location:', location);
  };

  const { mapRef, isLoading, error } = useGoogleMaps({
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 13,
    onLocationSelect: handleLocationSelect,
    draggable: true,
    showMarker: true
  });

  if (isLoading) return <div>Loading map...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div ref={mapRef} className="h-400 w-full" />;
}
\`\`\`

## 🏗️ **Architecture**

### **Core Files**

#### **`lib/google-maps.ts`**
- Centralized Google Maps loading
- Safe autocomplete creation with dedicated containers
- Proper cleanup utilities
- Geocoding and reverse geocoding functions

#### **`hooks/use-google-maps-autocomplete.ts`**
- React hook for autocomplete integration
- Automatic initialization and cleanup
- Error handling and loading states

#### **`hooks/use-google-maps.ts`**
- React hook for map integration
- Marker and event management
- Location selection handling

### **Key Features**

#### **1. Single Script Loading**
\`\`\`typescript
// Loads Google Maps only once, caches the instance
const google = await loadGoogleMaps();
\`\`\`

#### **2. Dedicated Containers**
\`\`\`typescript
// Creates isolated container for autocomplete dropdown
const container = document.createElement('div');
inputElement.parentElement?.appendChild(container);
\`\`\`

#### **3. Proper Cleanup**
\`\`\`typescript
// Cleans up listeners and removes containers
cleanupAutocomplete(autocomplete);
\`\`\`

## 🔧 **Migration Guide**

### **Before (Problematic)**
\`\`\`tsx
// ❌ Direct DOM manipulation
useEffect(() => {
  const autocomplete = new google.maps.places.Autocomplete(inputRef.current);
  // No cleanup, DOM conflicts
}, []);
\`\`\`

### **After (Safe)**
\`\`\`tsx
// ✅ React-friendly pattern
const { inputRef, isLoading, error } = useGoogleMapsAutocomplete({
  onPlaceSelect: handlePlaceSelect
});
\`\`\`

## 🛡️ **Error Handling**

### **Automatic Error Recovery**
- Invalid refs are detected and handled
- Network errors are caught and reported
- Loading states prevent race conditions

### **Graceful Degradation**
- Components show loading states
- Error messages are user-friendly
- Fallback behavior when Google Maps fails

## 📊 **Performance Benefits**

### **Reduced Bundle Size**
- Single Google Maps instance shared across components
- No duplicate script loading
- Efficient caching strategy

### **Better Memory Management**
- Automatic cleanup prevents memory leaks
- Event listeners are properly removed
- DOM nodes are cleaned up on unmount

## 🔍 **Debugging**

### **Common Issues**

#### **1. "Ref is not an HTMLInputElement"**
- Ensure input ref is properly attached
- Check component mounting order

#### **2. "Failed to load Google Maps API"**
- Verify API key configuration
- Check network connectivity

#### **3. Autocomplete not working**
- Ensure Google Maps is loaded
- Check for JavaScript errors in console

### **Debug Tools**
\`\`\`typescript
// Reset global state for testing
import { resetGoogleMapsState } from '@/lib/google-maps';
resetGoogleMapsState();
\`\`\`

## 🧪 **Testing**

### **Unit Tests**
\`\`\`typescript
// Test hook behavior
import { renderHook } from '@testing-library/react';
import { useGoogleMapsAutocomplete } from '@/hooks/use-google-maps-autocomplete';

test('should initialize autocomplete', () => {
  const { result } = renderHook(() => useGoogleMapsAutocomplete({
    onPlaceSelect: jest.fn()
  }));
  
  expect(result.current.isLoading).toBe(true);
});
\`\`\`

### **Integration Tests**
\`\`\`typescript
// Test component integration
import { render, screen } from '@testing-library/react';
import LocationInput from './LocationInput';

test('should render location input', () => {
  render(<LocationInput />);
  expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
});
\`\`\`

## 📝 **Best Practices**

### **1. Always Use Hooks**
- Don't create Google Maps instances directly
- Use the provided React hooks for all integration

### **2. Handle Loading States**
- Show loading indicators while Google Maps loads
- Disable inputs during initialization

### **3. Provide Error Feedback**
- Display error messages to users
- Implement fallback behavior

### **4. Clean Up Properly**
- Hooks handle cleanup automatically
- Don't manually manage Google Maps instances

## 🚨 **Important Notes**

### **API Key Security**
- Store API key in environment variables
- Use server-side API route for key delivery
- Never expose API key in client-side code

### **Rate Limiting**
- Google Maps API has usage limits
- Implement proper error handling for quota exceeded
- Consider caching geocoding results

### **Browser Compatibility**
- Test across different browsers
- Handle cases where Google Maps fails to load
- Provide fallback for unsupported browsers

## 🔄 **Migration Checklist**

- [ ] Replace direct Google Maps initialization with hooks
- [ ] Remove manual DOM manipulation
- [ ] Update error handling to use hook states
- [ ] Test all autocomplete and map components
- [ ] Verify cleanup on component unmount
- [ ] Update documentation and examples

## 📚 **Additional Resources**

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)
- [Google Maps Places API](https://developers.google.com/maps/documentation/javascript/places)
