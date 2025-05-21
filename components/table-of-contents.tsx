"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Section {
  id: string
  title: string
}

interface TableOfContentsProps {
  sections: Section[]
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState("")

  // Function to handle smooth scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100 // Offset for header

      // Find the current section
      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial check

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [sections])

  return (
    <div className="sticky top-24 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Table of Contents</h3>
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "block w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
              activeSection === section.id ? "bg-[#294a46] text-white font-medium" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {section.title}
          </button>
        ))}
      </nav>
    </div>
  )
}
