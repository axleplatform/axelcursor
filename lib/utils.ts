import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a readable format
 * @param dateString - The date string to format
 * @returns A formatted date string in the format "Tuesday, July 1st at 3:05 PM"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    
    // Get day of week
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Get month
    const month = date.toLocaleDateString('en-US', { month: 'long' })
    
    // Get day with ordinal suffix
    const day = date.getDate()
    const ordinalSuffix = getOrdinalSuffix(day)
    
    // Get time without leading zero
    const hour = date.getHours()
    const minute = date.getMinutes()
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12 // Convert 0 to 12 for 12 AM
    const displayMinute = minute < 10 ? `0${minute}` : `${minute}`
    
    return `${dayOfWeek}, ${month} ${day}${ordinalSuffix} at ${displayHour}:${displayMinute} ${ampm}`
  } catch (error: unknown) {
    return 'Invalid date'
  }
}

/**
 * Returns the ordinal suffix for a number (st, nd, rd, th)
 * @param num - The number to get the ordinal suffix for
 * @returns The ordinal suffix
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return 'st'
  }
  if (j === 2 && k !== 12) {
    return 'nd'
  }
  if (j === 3 && k !== 13) {
    return 'rd'
  }
  return 'th'
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

// Car issue mapping for display
const carIssueLabels: Record<string, string> = {
  "warning_lights": "Warning Lights On",
  "battery_issues": "Battery Issues",
  "engine_performance": "Engine Performance",
  "overheating": "Overheating",
  "fluid_leaks": "Fluid Leaks",
  "mechanical_damage": "Mechanical Damage",
  "electrical_problems": "Electrical Problems",
  "needs_towing": "Needs Towing",
  "unusual_noises": "Unusual Noises",
  "vibration": "Vibration"
}

/**
 * Convert car issue ID to proper display label
 */
export function formatCarIssue(issueId: string): string {
  return carIssueLabels[issueId] || issueId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Format car issues array for display
 */
export function formatCarIssues(issues: string[]): string[] {
  return issues.map(issue => formatCarIssue(issue))
}

/**
 * Format a date to show relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - The date string to format
 * @returns A relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    } else {
      return formatDate(dateString)
    }
  } catch (error) {
    return 'recently'
  }
}
