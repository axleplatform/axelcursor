import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a readable format
 * @param dateString - The date string to format
 * @returns A formatted date string in the format "Mon, Dec 25, 2023 at 2:30 PM"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    // Format as: "Mon, Dec 25, 2023 at 2:30 PM"
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Invalid date"
  }
}

/**
 * Validates a mechanic ID to ensure it's a valid UUID and not '0'
 * @param id The mechanic ID to validate
 * @returns An object containing validation result and error message if invalid
 */
export function validateMechanicId(id: string | undefined | null): { isValid: boolean; error?: string } {
  console.log("🔍 Validating mechanicId:", { 
    id, 
    type: typeof id,
    isString: typeof id === 'string',
    length: typeof id === 'string' ? id.length : 0,
    isZero: id === '0'
  })

  if (!id) {
    return { isValid: false, error: "No mechanic ID provided" }
  }

  if (typeof id !== 'string') {
    return { isValid: false, error: "Invalid mechanic ID type" }
  }

  if (id === '0') {
    return { isValid: false, error: "Invalid mechanic ID value" }
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { isValid: false, error: "Invalid mechanic ID format" }
  }

  return { isValid: true }
}
