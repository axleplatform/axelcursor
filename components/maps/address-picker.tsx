import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete
} from '@react-google-maps/api';

const libraries = ['places'];

interface AddressPickerProps { 
  onLocationSelect: (location: { 
    address: string; 
    coordinates: { lat: number; lng: number }; 
    placeId?: string; 
  }) => void; 
}

export function AddressPicker({ onLocationSelect }: AddressPickerProps) { 
  const [map, setMap] = useState(null); 
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 }); 
  const [markerPosition, setMarkerPosition] = useState(center); 
  const [address, setAddress] = useState(''); 
  const autocompleteRef = useRef(null);

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenter(userLocation);
          setMarkerPosition(userLocation);
          
          // Reverse geocode to get address
          reverseGeocode(userLocation);
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  }, []);

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
        onLocationSelect({
          address: results[0].formatted_address,
          coordinates: location,
          placeId: results[0].place_id
        });
      }
    });
  };

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onAutocompleteLoad = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        setCenter(newLocation);
        setMarkerPosition(newLocation);
        setAddress(place.formatted_address);
        
        onLocationSelect({
          address: place.formatted_address,
          coordinates: newLocation,
          placeId: place.place_id
        });
      }
    }
  };

  const onMarkerDragEnd = (e) => {
    const newLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarkerPosition(newLocation);
    reverseGeocode(newLocation);
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your service address
          </label>
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              placeholder="Start typing your address..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Autocomplete>
        </div>

        <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '400px' }}
            center={center}
            zoom={17}
            onLoad={onLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false
            }}
          >
            <Marker
              position={markerPosition}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }}
            />
          </GoogleMap>
        </div>

        <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <span className="mr-2">📍</span>
          Drag the pin to adjust your exact location
        </div>
      </div>
    </LoadScript>
  );
} 