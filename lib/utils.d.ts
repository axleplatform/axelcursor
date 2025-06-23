import { type ClassValue } from "clsx"

/**
 * Combines multiple class names into a single string, merging Tailwind classes
 * @param inputs - Array of class values (strings, objects, arrays, etc.)
 * @returns A single string of merged class names
 */
export function cn(...inputs: ClassValue[]): string

/**
 * Formats a date string into a readable format
 * @param dateString - The date string to format (ISO string or date string)
 * @returns A formatted date string in the format "YYYY-MM-DD @ HH:MM AM/PM"
 * @throws Will return "Invalid date" if the input is not a valid date
 */
export function formatDate(dateString: string): string
