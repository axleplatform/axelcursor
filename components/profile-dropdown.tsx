"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      router.replace("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#294a46] flex items-center justify-center text-white hover:bg-[#1e3632] transition-colors group"
        aria-label="Profile menu"
      >
        <User className="h-5 w-5" />
        <ChevronRight className="h-4 w-4 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 sm:w-56 rounded-md shadow-lg bg-white/65 backdrop-blur-[2px] ring-1 ring-black ring-opacity-5 z-50 max-w-[calc(100vw-2rem)]">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push("/mechanic/profile")
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
              role="menuitem"
            >
              <div className="h-4 w-4 flex-shrink-0">⚙️</div>
              <span className="truncate">Profile Settings</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600/90 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              role="menuitem"
            >
              <span className="truncate">{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
