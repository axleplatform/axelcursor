"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from "@/components/ui/input"

interface HomepageLocationInputProps {
  value?: string
  onChange?: (value: string) => void
  onLocationSelect: (location: any) => void
}

export default function HomepageLocationInput({ value, onChange, onLocationSelect }: HomepageLocationInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)

  useEffect(() => {
    let autocompleteElement: any
    let input: HTMLInputElement | null = null
    if (containerRef.current) {
      input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'Enter your location'
      input.className = 'pl-10 w-full h-12 border rounded-md bg-gray-50 px-3 text-sm'
      if (value) input.value = value
      containerRef.current.appendChild(input)
      inputRef.current = input
    }

    let cleanup = () => {}

    const loadAutocomplete = async () => {
      const { loadGoogleMaps } = await import('@/lib/google-maps')
      const google = await loadGoogleMaps()
      autocompleteElement = new google.maps.places.PlaceAutocompleteElement({ componentRestrictions: { country: 'us' } })
      autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
        const place = event.place
        if (onChange) onChange(place.formattedAddress || place.displayName || '')
        if (onLocationSelect) onLocationSelect(place)
      })
      // Replace the input with the autocomplete element
      if (containerRef.current && input) {
        containerRef.current.replaceChild(autocompleteElement, input)
        setAutocomplete(autocompleteElement)
      }
      cleanup = () => {
        if (containerRef.current && autocompleteElement) {
          containerRef.current.removeChild(autocompleteElement)
        }
      }
    }
    loadAutocomplete()
    return () => {
      cleanup()
      if (containerRef.current && input) {
        try { containerRef.current.removeChild(input) } catch {}
      }
    }
  }, [onChange, onLocationSelect])

  // Keep value in sync
  useEffect(() => {
    if (autocomplete && value !== undefined) {
      autocomplete.value = value
    }
  }, [autocomplete, value])

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">Enter your location</label>
      <div className="relative" ref={containerRef} />
    </div>
  )
}
