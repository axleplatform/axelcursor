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
export function validateMechanicId(mechanicId: string | null): { isValid: boolean; error?: string } {
  if (!mechanicId || typeof mechanicId !== 'string') {
    return { isValid: false, error: 'Mechanic ID is required and must be a string' }
  }
  
  if (mechanicId.trim().length === 0) {
    return { isValid: false, error: 'Mechanic ID cannot be empty' }
  }
  
  if (mechanicId === '0') {
    return { isValid: false, error: 'Invalid mechanic ID: cannot be "0"' }
  }
  
  // Basic UUID format check (loose validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(mechanicId)) {
    return { isValid: false, error: 'Invalid mechanic ID format' }
  }
  
  return { isValid: true }
}
