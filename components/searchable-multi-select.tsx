"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface SearchableMultiSelectProps {
  options: string[]
  selectedValues: string[]
  onValueChange: (values: string[]) => void
  placeholder: string
  searchPlaceholder?: string
  addCustomLabel?: string
  className?: string
  tagColor?: "green" | "yellow" | "red"
}

export default function SearchableMultiSelect({
  options,
  selectedValues,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search...",
  addCustomLabel = "Add custom entry",
  className = "",
  tagColor = "green",
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [customValue, setCustomValue] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  // Initialize portal container on mount
  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  // Get tag color class based on the tagColor prop
  const getTagColorClass = () => {
    switch (tagColor) {
      case "yellow":
        return "bg-amber-100 text-amber-800"
      case "red":
        return "bg-red-100 text-red-800"
      case "green":
      default:
        return "bg-[#e6eeec] text-[#294a46]"
    }
  }

  // Filter options based on search value
  const filteredOptions = options.filter(
    (option) => !selectedValues.includes(option) && option.toLowerCase().includes(searchValue.toLowerCase()),
  )

  // Update dropdown position when showing dropdown
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Focus custom input when showing custom input
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [showCustomInput])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node)
      const dropdownElement = document.getElementById("multi-select-dropdown")
      const isOutsideDropdown = dropdownElement && !dropdownElement.contains(event.target as Node)

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false)
        setShowCustomInput(false)
        setCustomValue("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onValueChange(selectedValues.filter((value) => value !== option))
    } else {
      onValueChange([...selectedValues, option])
    }
  }

  const removeValue = (valueToRemove: string) => {
    onValueChange(selectedValues.filter((value) => value !== valueToRemove))
  }

  const handleAddCustomValue = () => {
    const trimmedValue = customValue.trim()
    if (trimmedValue && !selectedValues.includes(trimmedValue)) {
      onValueChange([...selectedValues, trimmedValue])
      setCustomValue("")
      setShowCustomInput(false)
      setSearchValue("")
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddCustomValue()
    } else if (e.key === "Escape") {
      setShowCustomInput(false)
      setCustomValue("")
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  // Render dropdown using portal
  const renderDropdown = () => {
    if (!isOpen || !portalContainer) return null

    return createPortal(
      <div
        id="multi-select-dropdown"
        className="bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden z-50"
        style={{
          position: "absolute",
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "300px",
          zIndex: 9999,
        }}
      >
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[200px]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm"
              >
                <div className="w-5 h-5 mr-2 flex items-center justify-center">
                  {selectedValues.includes(option) && <Check className="h-4 w-4 text-[#294a46]" />}
                </div>
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
          )}
        </div>

        {!showCustomInput ? (
          <div
            onClick={() => setShowCustomInput(true)}
            className="px-3 py-2 border-t border-gray-100 hover:bg-gray-100 cursor-pointer flex items-center text-sm text-[#294a46]"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addCustomLabel}
          </div>
        ) : (
          <div className="p-2 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                ref={customInputRef}
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                placeholder="Enter custom value..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
              />
              <button
                type="button"
                onClick={handleAddCustomValue}
                disabled={!customValue.trim()}
                className={cn(
                  "px-3 py-2 rounded-md text-white font-medium text-sm",
                  customValue.trim() ? "bg-[#294a46] hover:bg-[#1e3632]" : "bg-gray-300 cursor-not-allowed",
                )}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>,
      portalContainer,
    )
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white cursor-pointer hover:border-gray-300"
      >
        <div className="flex-1 min-h-[24px]">
          {selectedValues.length === 0 && <span className="text-gray-400 text-sm">{placeholder}</span>}
        </div>
        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
      </div>

      {/* Selected values */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues.map((value) => (
            <div key={value} className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-sm", getTagColorClass())}>
              <span>{value}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeValue(value)
                }}
                className="hover:text-gray-700 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Render dropdown using portal */}
      {renderDropdown()}
    </div>
  )
}
