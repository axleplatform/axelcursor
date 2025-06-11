"use client"

import React from 'react'
import { Clock, MapPin, Check, X } from "lucide-react"

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
}) {
  const myQuote = appointment.mechanic_quotes?.find(q => q.mechanic_id === mechanicId)
  const isSelected = appointment.selected_mechanic_id === mechanicId
  const isEditing = selectedAppointment?.id === appointment.id

  // Generate available dates (next 7 days)
  const getAvailableDates = () => {
    const dates = []
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
  const getTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
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

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
      isUpcoming ? 'border border-gray-200' : 'bg-[#294a46] text-white'
    }`}>
      {/* Service type and vehicle info */}
      <h3 className="text-lg font-semibold mb-2">{appointment.service_type}</h3>
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
              onChange={(e) => setPrice(e.target.value)}
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
            onChange={(e) => setSelectedDate(e.target.value)}
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
            {getAvailableDates().map((date) => (
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
            value={isEditing ? selectedTime : new Date(myQuote?.eta).toTimeString().slice(0,5) || ''}
            onChange={(e) => setSelectedTime(e.target.value)}
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
            {getTimeSlots().map((slot) => (
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
            onChange={(e) => setNotes(e.target.value)}
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
      <div className="flex gap-3">
        {!isSelected && (
          <>
            {isEditing ? (
              <>
                <button
                  onClick={() => onUpdate?.(appointment.id)}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    isUpcoming
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-[#294a46] hover:bg-gray-100'
                  }`}
                >
                  Update Quote
                </button>
                <button
                  onClick={onCancel}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    isUpcoming
                      ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      : 'border border-white text-white hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onEdit(appointment)
                    setPrice(myQuote?.price.toString() || '')
                    const quoteDate = new Date(myQuote?.eta)
                    setSelectedDate(quoteDate.toISOString().split('T')[0])
                    setSelectedTime(quoteDate.toTimeString().slice(0,5))
                    setNotes(myQuote?.notes || '')
                  }}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    isUpcoming
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-white text-[#294a46] hover:bg-gray-100'
                  }`}
                >
                  Edit Quote
                </button>
                {!isUpcoming && onSkip && (
                  <button
                    onClick={() => onSkip(appointment.id)}
                    className="flex-1 border border-white text-white py-2 px-4 rounded-md hover:bg-white/10 transition-colors"
                  >
                    Skip
                  </button>
                )}
              </>
            )}
          </>
        )}
        {!isUpcoming && !isEditing && onSubmit && (
          <button
            onClick={() => onSubmit(appointment.id)}
            className="flex-1 bg-white text-[#294a46] py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
          >
            Submit Quote
          </button>
        )}
      </div>
    </div>
  )
} 