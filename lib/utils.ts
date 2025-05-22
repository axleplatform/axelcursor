import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    // Format date: YYYY-MM-DD @ HH:MM AM/PM
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"

    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'

    return `${year}-${month}-${day} @ ${hours}:${minutes} ${ampm}`
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString || "No date available"
  }
}
