"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface PersonalInfoFormProps {
  onSubmit: (data: {
    firstName: string
    lastName: string
    dateOfBirth: string
    phoneNumber: string
  }) => Promise<void>
  initialData?: {
    firstName?: string
    lastName?: string
    dateOfBirth?: string
    phoneNumber?: string
  }
  buttonText?: string
}

export default function PersonalInfoForm({
  onSubmit,
  initialData = {},
  buttonText = "Continue",
}: PersonalInfoFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    dateOfBirth: initialData.dateOfBirth || "",
    phoneNumber: initialData.phoneNumber || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-numeric characters
    const cleaned = e.target.value.replace(/\D/g, "")

    // Format the phone number
    let formatted = ""
    if (cleaned.length <= 3) {
      formatted = cleaned
    } else if (cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 3)})-${cleaned.slice(3)}`
    } else {
      formatted = `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }

    setFormData({ ...formData, phoneNumber: formatted })

    // Clear error if field is now valid
    if (errors.phoneNumber && formatted.length >= 14) {
      setErrors({ ...errors, phoneNumber: "" })
    }
  }

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error if field is now valid
    if (errors[name] && value.trim()) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Required"
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Required"
    } else {
      // Check if user is at least 18 years old
      const dob = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()

      if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())))) {
        newErrors.dateOfBirth = "Must be at least 18 years old"
      }
    }

    if (!formData.phoneNumber || formData.phoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.phoneNumber = "Valid phone number required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
      <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
        {/* Form Fields */}
        <div className="px-4 py-3 space-y-3">
          {/* First Name */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First name <span className="text-red-500">*</span>
              </label>
              {errors.firstName && <span className="text-sm text-red-500">{errors.firstName}</span>}
            </div>
            <input
              type="text"
              name="firstName"
              id="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={cn(
                "shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10",
                errors.firstName && "border-red-300 focus:border-red-500 focus:ring-red-500",
              )}
            />
          </div>

          {/* Last Name */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last name <span className="text-red-500">*</span>
              </label>
              {errors.lastName && <span className="text-sm text-red-500">{errors.lastName}</span>}
            </div>
            <input
              type="text"
              name="lastName"
              id="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={cn(
                "shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10",
                errors.lastName && "border-red-300 focus:border-red-500 focus:ring-red-500",
              )}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                Date of birth <span className="text-red-500">*</span>
              </label>
              {errors.dateOfBirth && <span className="text-sm text-red-500">{errors.dateOfBirth}</span>}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                name="dateOfBirth"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={format(new Date(), "yyyy-MM-dd")}
                className={cn(
                  "pl-9 shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10",
                  errors.dateOfBirth && "border-red-300 focus:border-red-500 focus:ring-red-500",
                )}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone number <span className="text-red-500">*</span>
              </label>
              {errors.phoneNumber && <span className="text-sm text-red-500">{errors.phoneNumber}</span>}
            </div>
            <input
              type="tel"
              name="phoneNumber"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(123)-456-7890"
              className={cn(
                "shadow-sm focus:ring-[#294a46] focus:border-[#294a46] block w-full text-base border-gray-200 rounded-md h-10",
                errors.phoneNumber && "border-red-300 focus:border-red-500 focus:ring-red-500",
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-4 py-3 bg-gray-50">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#294a46] hover:bg-[#1e3632] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a46] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Processing...
              </>
            ) : (
              buttonText
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
