"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HelpSearchForm() {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search query - this would typically connect to a search API
    console.log("Searching for:", query)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help topics..."
          className="block w-full p-4 pl-12 pr-20 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#294a46] focus:border-[#294a46]"
        />
        <Button
          type="submit"
          className="absolute right-2.5 bottom-2.5 bg-[#294a46] hover:bg-[#1e3632] text-white rounded-lg text-sm px-4 py-2"
        >
          Search
        </Button>
      </div>
    </form>
  )
}
