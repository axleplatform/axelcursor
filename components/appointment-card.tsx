"use client"

import React from 'react'
import { Clock, MapPin, Check, X } from "lucide-react"
import type { Appointment, MechanicQuote } from "@/types/index"

interface AppointmentCardProps {
  appointment: Appointment
  mechanicId: string
  isUpcoming?: boolean
  selectedAppointment?: Appointment | null
  onEdit?: (appointment: Appointment | null) => void
  onUpdate?: (appointmentId: string) => void
  onCancel?: (appointmentId: string) => void
  onSkip?: (appointment: Appointment) => void
  onSubmit?: (appointmentId: string) => void
  price: string
  setPrice: (price: string) => void
  selectedDate: string
  setSelectedDate: (date: string) => void
  selectedTime: string
  setSelectedTime: (time: string) => void
  notes: string
  setNotes: (notes: string) => void
}

interface DateOption {
  value: string
  label: string
}

interface TimeSlot {
  value: string
  label: string
}

export default function AppointmentCard({ 
  appointment, 
  mechanicId,
  isUpcoming = false,
  selectedAppointment,
  onEdit,
  onUpdate,
  onCancel,
  onSkip,
  onSubmit,
  price,
  setPrice,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  notes,
  setNotes
}: AppointmentCardProps) {
  const myQuote = appointment.mechanic_quotes?.find((q: MechanicQuote) => q.mechanic_id === mechanicId)
  const isSelected = appointment.selected_mechanic_id === mechanicId
  const isEditing = selectedAppointment?.id === appointment.id

  // Generate available dates (next 7 days)
  const getAvailableDates = (): DateOption[] => {
    const dates: DateOption[] = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        })
      })
    }
    return dates
  }

  // Generate time slots (8 AM to 6 PM, 15-minute increments)
  // For TODAY: Only show times from current hour onwards (no past times)
  // For FUTURE DATES: Show all times (full day available)
  const getTimeSlots = (forDate?: string): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const now = new Date()
    const today = now.toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Determine if we're generating slots for today
    const isToday = forDate === today
    
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // For today: Skip times that have already passed
        if (isToday) {
          // Skip if hour has passed
          if (hour < currentHour) continue
          // Skip if same hour but minute has passed
          if (hour === currentHour && minute < currentMinute) continue
        }
        
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        })
        slots.push({ value: time, label: displayTime })
      }
    }
    return slots
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTime(e.target.value)
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
  }

  // Get service display text
  const getServiceDisplay = () => {
    if (appointment.selected_services && appointment.selected_services.length > 0) {
      return appointment.selected_services.join(', ')
    }
    return appointment.issue_description || 'Service Request'
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
      isUpcoming ? 'border border-gray-200' : 'bg-[#294a46] text-white'
    }`}>
      {/* Service type and vehicle info */}
      <h3 className="text-lg font-semibold mb-2">{getServiceDisplay()}</h3>
      <p className={`mb-1 ${isUpcoming ? 'text-gray-600' : 'text-white/70'}`}>
        {appointment.vehicles?.year} {appointment.vehicles?.make} {appointment.vehicles?.model}
      </p>
      <p className={`mb-4 ${isUpcoming ? 'text-gray-600' : 'text-white/70'}`}>{appointment.location}</p>
      
      {/* Status indicator */}
      {isUpcoming && (
        <div className="mb-4">
          {isSelected ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              <Check className="h-4 w-4 mr-1" />
              Customer selected you
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              <Clock className="h-4 w-4 mr-1" />
              Awaiting customer selection
            </span>
          )}
        </div>
      )}
      
      {/* Price and Date/Time fields */}
      <div className="space-y-3 mb-4">
        {/* Price */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isUpcoming ? 'text-gray-700' : 'text-white/70'
          }`}>
            Your Quote Price
          </label>
          <div className="relative">
            <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isUpcoming ? 'text-gray-500' : 'text-white/70'
            }`}>$</span>
            <input
              type="number"
              value={isEditing ? price : myQuote?.price || ''}
              onChange={handlePriceChange}
              disabled={!isEditing || isSelected}
              className={`w-full p-2 border rounded-md pl-8 ${
                isUpcoming 
                  ? isEditing && !isSelected 
                    ? 'border-blue-500 bg-white' 
                    : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : isEditing && !isSelected
                    ? 'border-white/50 bg-white/10 text-white'
                    : 'border-white/20 bg-white/5 text-white/70 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
        
        {/* Date */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isUpcoming ? 'text-gray-700' : 'text-white/70'
          }`}>
            Available Date
          </label>
          <select
            value={isEditing ? selectedDate : myQuote?.eta?.split('T')[0] || ''}
            onChange={handleDateChange}
            disabled={!isEditing || isSelected}
            className={`w-full p-2 border rounded-md ${
              isUpcoming 
                ? isEditing && !isSelected 
                  ? 'border-blue-500 bg-white' 
                  : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : isEditing && !isSelected
                  ? 'border-white/50 bg-white/10 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 cursor-not-allowed'
            }`}
          >
            {getAvailableDates().map((date: DateOption) => (
              <option key={date.value} value={date.value} className={isUpcoming ? '' : 'bg-[#294a46]'}>
                {date.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Time */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isUpcoming ? 'text-gray-700' : 'text-white/70'
          }`}>
            Available Time
          </label>
          <select
            value={isEditing ? selectedTime : myQuote?.eta ? new Date(myQuote.eta).toTimeString().slice(0,5) : ''}
            onChange={handleTimeChange}
            disabled={!isEditing || isSelected}
            className={`w-full p-2 border rounded-md ${
              isUpcoming 
                ? isEditing && !isSelected 
                  ? 'border-blue-500 bg-white' 
                  : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : isEditing && !isSelected
                  ? 'border-white/50 bg-white/10 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 cursor-not-allowed'
            }`}
                      >
              {getTimeSlots(isEditing ? selectedDate : myQuote?.eta?.split('T')[0] || '').map((slot: TimeSlot) => (
                <option key={slot.value} value={slot.value} className={isUpcoming ? '' : 'bg-[#294a46]'}>
                  {slot.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Notes field */}
      {isEditing && (
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${
            isUpcoming ? 'text-gray-700' : 'text-white/70'
          }`}>
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            className={`w-full p-2 border rounded-md ${
              isUpcoming 
                ? 'border-gray-300'
                : 'border-white/20 bg-white/10 text-white'
            }`}
            rows={2}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!isUpcoming && !isEditing && (
          <>
            <button
              onClick={() => onEdit?.(appointment)}
              className="flex-1 bg-white text-[#294a46] px-3 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Quote
            </button>
            <button
              onClick={() => onSkip?.(appointment)}
              className="flex-1 bg-white/20 text-white px-3 py-2 rounded-md font-medium hover:bg-white/30 transition-colors"
            >
              Skip
            </button>
          </>
        )}
        
        {!isUpcoming && isEditing && (
          <>
            <button
              onClick={() => onSubmit?.(appointment.id)}
              className="flex-1 bg-white text-[#294a46] px-3 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Submit Quote
            </button>
            <button
              onClick={() => onEdit?.(null)}
              className="flex-1 bg-white/20 text-white px-3 py-2 rounded-md font-medium hover:bg-white/30 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
        
        {isUpcoming && (
          <>
            {!isSelected && (
              <button
                onClick={() => onEdit?.(appointment)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Edit Quote
              </button>
            )}
            
            {isSelected && (
              <>
                <button
                  onClick={() => onUpdate?.(appointment.id)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md font-medium hover:bg-green-700 transition-colors"
                >
                  Start Service
                </button>
                <button
                  onClick={() => onCancel?.(appointment.id)}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md font-medium hover:bg-red-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
} 