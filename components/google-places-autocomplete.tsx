'use client'

import { useEffect, useRef, useState } from 'react'

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: any) => void
  placeholder?: string
  className?: string
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Enter your address",
  className = ""
}: GooglePlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let autocompleteElement: any = null
    let mounted = true

    const initAutocomplete = async () => {
      // Wait for Google Maps to load
      if (!window.google?.maps?.places) {
        if (mounted) {
          setTimeout(initAutocomplete, 100)
        }
        return
      }

      // Check if container still exists
      if (!mounted || !containerRef.current) return

      try {
        // Clear container first
        containerRef.current.innerHTML = ''

        // Try new API first
        if (window.google.maps.places.PlaceAutocompleteElement) {
          autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: 'us' }
          })
          
          // Add to container
          containerRef.current.appendChild(autocompleteElement)
          
          // Add placeholder
          const input = autocompleteElement.querySelector('input')
          if (input) {
            input.placeholder = placeholder
          }

          // Handle selection
          autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
            if (mounted && event.place) {
              onPlaceSelect(event.place)
            }
          })
        } else {
          // Fallback to input field
          const input = document.createElement('input')
          input.type = 'text'
          input.placeholder = placeholder
          input.className = 'w-full px-3 py-2 border rounded-lg'
          containerRef.current.appendChild(input)

          // Use old autocomplete
          const autocomplete = new window.google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
          })

          autocomplete.addListener('place_changed', () => {
            if (mounted) {
              const place = autocomplete.getPlace()
              if (place.geometry) {
                onPlaceSelect(place)
              }
            }
          })
        }

        setIsLoaded(true)
      } catch (error) {
        console.error('Autocomplete init error:', error)
        // Show fallback input
        if (containerRef.current && mounted) {
          containerRef.current.innerHTML = `
            <input 
              type="text" 
              placeholder="${placeholder}" 
              class="w-full px-3 py-2 border rounded-lg"
              disabled
            />
          `
        }
      }
    }

    initAutocomplete()

    // Cleanup
    return () => {
      mounted = false
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [onPlaceSelect, placeholder])

  return (
    <div ref={containerRef} className={`google-places-container ${className}`}>
      {!isLoaded && (
        <input
          type="text"
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          disabled
        />
      )}
    </div>
  )
} 