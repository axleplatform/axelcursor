"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { X } from "lucide-react"
import { createPortal } from "react-dom"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  maxTags?: number
  className?: string
}

export default function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = "Add a tag...",
  maxTags = 10,
  className = "",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize portal container on mount
  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  // Use useMemo for filtering suggestions
  const filteredSuggestions = useMemo(() => {
    if (inputValue.trim()) {
      return suggestions.filter(
        (suggestion) => suggestion.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(suggestion),
      )
    }
    return suggestions.filter((suggestion) => !tags.includes(suggestion))
  }, [inputValue, suggestions, tags])

  // Update dropdown position when showing suggestions
  useEffect(() => {
    if (showSuggestions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [showSuggestions])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the container and the dropdown
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node)
      const dropdownElement = document.getElementById("tag-suggestions-dropdown")
      const isOutsideDropdown = dropdownElement && !dropdownElement.contains(event.target as Node)

      if (isOutsideContainer && isOutsideDropdown) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag])
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "Tab", ","].includes(e.key)) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!showSuggestions) {
      setShowSuggestions(true)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Render dropdown using portal
  const renderSuggestionsDropdown = () => {
    if (!showSuggestions || filteredSuggestions.length === 0 || !portalContainer) return null

    return createPortal(
      <div
        id="tag-suggestions-dropdown"
        className="bg-white border border-gray-200 rounded-md shadow-lg overflow-auto"
        style={{
          position: "absolute",
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "200px",
          zIndex: 9999,
        }}
      >
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm"
          >
            <span className="text-sm mr-2 text-gray-500">+</span>
            {suggestion}
          </div>
        ))}
      </div>,
      portalContainer,
    )
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-md bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-[#294a46] focus-within:border-[#294a46]"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1 bg-[#e6eeec] text-[#294a46] px-2 py-1 rounded-md text-sm">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-[#294a46] hover:text-[#1e3632] focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-grow min-w-[120px] outline-none text-sm p-1"
          disabled={tags.length >= maxTags}
        />
      </div>

      {/* Render suggestions dropdown using portal */}
      {renderSuggestionsDropdown()}

      {tags.length >= maxTags && <p className="text-xs text-amber-600 mt-1">Maximum of {maxTags} tags reached.</p>}
    </div>
  )
}
