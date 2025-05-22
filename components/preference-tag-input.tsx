"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PreferenceTagInputProps {
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (index: number) => void
  placeholder: string
  tagColor?: "green" | "yellow" | "red"
  label?: string
}

export default function PreferenceTagInput({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder,
  tagColor = "green",
  label,
}: PreferenceTagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Handle adding a tag
  const handleAddTag = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !tags.includes(trimmedValue)) {
      onAddTag(trimmedValue)
      setInputValue("")
    }
  }

  // Handle key press events
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <div key={index} className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-sm", getTagColorClass())}>
            <span>{tag}</span>
            <button type="button" onClick={() => onRemoveTag(index)} className="hover:text-gray-700 focus:outline-none">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Input and Add Button */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
        />
        <button
          type="button"
          onClick={handleAddTag}
          disabled={!inputValue.trim()}
          className={cn(
            "px-4 py-2 rounded-md text-white font-medium",
            inputValue.trim() ? "bg-[#294a46] hover:bg-[#1e3632]" : "bg-gray-300 cursor-not-allowed",
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
