"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"

// You can replace these with your preferred icon components
const Calendar = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

const Clock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

const ChevronLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)

const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
)

interface DateTimeSelectorProps {
  onDateTimeChange: (date: Date, time: string) => void
  onTimeSelected?: () => void
  isUrgent?: boolean
}

interface DateTimeSelectorRef {
  openDateDropdown: () => void
  openTimeDropdown: () => void
  isFormComplete: () => boolean
}

export const DateTimeSelector = forwardRef<DateTimeSelectorRef, DateTimeSelectorProps>(({ onDateTimeChange, onTimeSelected, isUrgent = false }, ref) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimeSelector, setShowTimeSelector] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState("")
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()))

  // Expose methods via ref for progressive navigation
  useImperativeHandle(ref, () => ({
    openDateDropdown: () => {
      setShowCalendar(true)
      setShowTimeSelector(false)
    },
    openTimeDropdown: () => {
      setShowTimeSelector(true)
      setShowCalendar(false)
    },
    isFormComplete: () => {
      return !!(selectedTime && selectedTime !== "")
    }
  }))

  // Get the start date of the week (Sunday) for a given date
  function getWeekStart(date: Date): Date {
    const result = new Date(date)
    const day = result.getDay()
    result.setDate(result.getDate() - day)
    return result
  }

  // Generate days for the current week view
  function generateWeekDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      return day
    })
  }

  const weekDays = generateWeekDays(currentWeekStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today to start of day for comparison

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart)
    prevWeek.setDate(prevWeek.getDate() - 7)

    // Don't allow navigating to weeks before the current week
    if (prevWeek >= getWeekStart(today)) {
      setCurrentWeekStart(prevWeek)
    }
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setCurrentWeekStart(nextWeek)
  }

  // Generate time slots in 30-minute increments with AM/PM format
  const allTimeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour24 = Math.floor(i / 2)
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
    const minute = (i % 2) * 30
    const ampm = hour24 < 12 ? "AM" : "PM"
    return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`
  })

  // Get the next available 30-minute interval from current time + 30-minute buffer
  const getNextTimeSlot = () => {
    const now = new Date()
    // Add 30-minute buffer for same-day appointments
    const bufferTime = new Date(now.getTime() + 30 * 60 * 1000)
    const hour = bufferTime.getHours()
    const minute = bufferTime.getMinutes()

    // Calculate the index in the time slots array, rounding UP to next slot
    let index = hour * 2 + (minute > 0 ? 1 : 0)
    if (minute > 30) {
      index = hour * 2 + 2
    }

    // Make sure we don't go beyond the available slots
    if (index >= allTimeSlots.length) {
      index = allTimeSlots.length - 1
    }

    return {
      index,
      timeSlot: allTimeSlots[index],
    }
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if a date is in the past
  const isPastDate = (date: Date) => {
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0) // Normalize to start of day
    return compareDate < today
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
    return date.toLocaleDateString("en-US", options)
  }

  // Format month and year for calendar header
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  // Update available time slots based on selected date and urgent mode
  useEffect(() => {
    if (isToday(selectedDate)) {
      if (isUrgent) {
        // For urgent appointments today, show all current and future time slots
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        let currentIndex = currentHour * 2 + (currentMinute < 30 ? 0 : 1)
        
        // If we're past the current 30-minute slot, start from next slot
        if (currentMinute > 30) {
          currentIndex = currentHour * 2 + 2
        }
        
        const urgentTimeSlots = allTimeSlots.slice(currentIndex)
        setAvailableTimeSlots(urgentTimeSlots)
        
        // Clear invalid time selections for urgent mode
        if (!selectedTime || !urgentTimeSlots.includes(selectedTime)) {
          setSelectedTime("") // Force user to select a valid time
        }
      } else {
        // For regular appointments today, use 30-minute buffer requirement
        const { index } = getNextTimeSlot()
        const validTimeSlots = allTimeSlots.slice(index)

        setAvailableTimeSlots(validTimeSlots)

        // For today, clear invalid time selections
        if (!selectedTime || !validTimeSlots.includes(selectedTime)) {
          setSelectedTime("") // Force user to select a valid time
        }
      }
    } else {
      // For future dates, show all time slots regardless of urgent mode
      setAvailableTimeSlots(allTimeSlots)

      // For future dates, clear time selection to force user to pick
      if (!allTimeSlots.includes(selectedTime)) {
        setSelectedTime("") // Force user to select a time for future dates
      }
    }
  }, [selectedDate, isUrgent])

  // Notify parent component when BOTH date AND time are properly selected
  // This prevents auto-submission by ensuring incomplete selections don't trigger updates
  useEffect(() => {
    // Only notify parent when we have a complete date/time selection
    // This prevents partial selections from triggering form validation or submission
    if (selectedTime && selectedTime !== "") {
      onDateTimeChange(selectedDate, selectedTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime])

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (!isPastDate(date)) {
      setSelectedDate(date)
      setShowCalendar(false)
      
      // After selecting date, automatically open time selector for progressive navigation
      setTimeout(() => {
        setShowTimeSelector(true)
      }, 150)
    }
  }

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setShowTimeSelector(false)
    
    // Call the callback for progressive navigation
    if (onTimeSelected) {
      setTimeout(() => {
        onTimeSelected()
      }, 100)
    }
  }

  // Format day number (1-31)
  const formatDayNumber = (date: Date) => {
    return date.getDate()
  }

  // Format day name (Mon, Tue, etc.)
  const formatDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showCalendar || showTimeSelector) {
        // Check if the click is outside the calendar or time selector
        if (!target.closest(".date-selector") && !target.closest(".time-selector")) {
          setShowCalendar(false)
          setShowTimeSelector(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showCalendar, showTimeSelector])

  return (
    <div className="flex gap-4 mb-6">
      {/* Date Selector */}
      <div className="relative flex-1 date-selector">
        <button
          type="button"
          className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50 w-full"
          onClick={() => {
            setShowCalendar(!showCalendar)
            setShowTimeSelector(false)
          }}
        >
          <Calendar />
          <span>{isToday(selectedDate) ? "Today" : formatDate(selectedDate)}</span>
          <span className="ml-1">▼</span>
        </button>

        {showCalendar && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={goToPreviousWeek}
                className="p-1 rounded-full hover:bg-gray-100"
                disabled={getWeekStart(today).getTime() === currentWeekStart.getTime()}
              >
                <ChevronLeft />
              </button>
              <div className="text-center font-medium">{formatMonthYear(currentWeekStart)}</div>
              <button
                type="button"
                onClick={goToNextWeek}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Day names (Sun, Mon, etc.) */}
              {weekDays.map((date, index) => (
                <div key={`header-${index}`} className="text-xs font-medium text-gray-500 text-center">
                  {formatDayName(date)}
                </div>
              ))}

              {/* Day cells */}
              {weekDays.map((date, index) => {
                const isDisabled = isPastDate(date)
                const isSelected =
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()

                return (
                  <button
                    type="button"
                    key={`day-${index}`}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm mx-auto ${
                      isDisabled
                        ? "text-gray-300 cursor-not-allowed"
                        : isToday(date)
                          ? "bg-[#294a46] text-white hover:bg-[#1e3632]"
                          : isSelected
                            ? "bg-[#e6eeec] text-[#294a46]"
                            : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    aria-selected={isSelected}
                  >
                    {formatDayNumber(date)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Time Selector */}
      <div className="relative flex-1 time-selector">
        <button
          type="button"
          className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50 w-full"
          onClick={() => {
            setShowTimeSelector(!showTimeSelector)
            setShowCalendar(false)
          }}
        >
          <Clock />
          <span>{selectedTime || "Select time"}</span>
          <span className="ml-1">▼</span>
        </button>

        {showTimeSelector && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
            {isToday(selectedDate) && (
              <div className={`px-4 py-2 text-xs text-gray-500 border-b border-gray-100 ${isUrgent ? 'bg-orange-50' : 'bg-blue-50'}`}>
                {isUrgent ? 
                  "⚡ Urgent mode: Current and future times available for immediate service" :
                  "ℹ️ Today's appointments require 30 minutes advance notice"
                }
              </div>
            )}
            {availableTimeSlots.length > 0 ? (
              availableTimeSlots.map((time) => (
                <button
                  type="button"
                  key={time}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${
                    time === selectedTime ? "bg-gray-100" : ""
                  }`}
                  onClick={() => handleTimeSelect(time)}
                >
                  {time}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No available times today</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
