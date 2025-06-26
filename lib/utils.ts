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
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error: unknown) {
    return 'Invalid date'
  }
}

/**
 * Validates a mechanic ID to ensure it's a valid UUID and not '0'
 * @param id The mechanic ID to validate
 * @returns An object containing validation result and error message if invalid
 */
export function validateMechanicId(mechanicId: string | null): boolean {
  if (!mechanicId || typeof mechanicId !== 'string') {
    return false
  }
  
  const isValid = mechanicId.length > 0 && mechanicId !== '0' && mechanicId.trim().length > 0
  return isValid
}
