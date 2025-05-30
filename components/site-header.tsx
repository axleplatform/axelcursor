"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/axle-logo-green.png"
              alt="Axle - Mobile Mechanic Service"
              width={80}
              height={32}
              priority
              className="h-auto"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#294a46]">
            Log In
          </Link>
          <Button asChild className="rounded-full bg-[#294a46] hover:bg-[#1e3632] text-white">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Desktop Right Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/about"
            className={cn(
              "text-sm font-medium",
              isActive("/about") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
            )}
          >
            About
          </Link>
          <Link
            href="/help"
            className={cn(
              "text-sm font-medium",
              isActive("/help") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
            )}
          >
            Help
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 text-gray-700"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 py-4 px-4 shadow-lg">
          <nav className="flex flex-col space-y-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-[#294a46] py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-[#294a46] hover:bg-[#1e3632] py-2 px-4 rounded-full inline-block text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign Up
            </Link>
            <Link
              href="/about"
              className={cn(
                "text-sm font-medium py-2",
                isActive("/about") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/help"
              className={cn(
                "text-sm font-medium py-2",
                isActive("/help") ? "text-[#294a46]" : "text-gray-700 hover:text-[#294a46]",
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Help
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
