"use client"

import * as React from 'react';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

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
  onDateChange: (date: Date) => void
  onTimeChange: (time: string) => void
  onTimeSelected?: () => void
  selectedTime?: string
  selectedDate?: Date
}

interface DateTimeSelectorRef {
  openDateDropdown: () => void
  openTimeDropdown: () => void
  isFormComplete: () => boolean
}

export const DateTimeSelector = forwardRef<DateTimeSelectorRef, DateTimeSelectorProps>(({ onDateChange, onTimeChange, onTimeSelected, selectedTime: controlledTime, selectedDate: controlledDate }, ref) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimeSelector, setShowTimeSelector] = useState(false)
  const getTodayLocal = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const [internalDate, setInternalDate] = useState(getTodayLocal());
  const [internalTime, setInternalTime] = useState("")
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(getTodayLocal()));

  // Use controlled or internal state
  const selectedDate = controlledDate || internalDate;
  const selectedTime = controlledTime !== undefined ? controlledTime : internalTime;

  // On mount, notify parent of default date if not controlled
  useEffect(() => {
    if (!controlledDate) {
      onDateChange(getTodayLocal());
    }
  }, []);

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
    // Use local year/month/day constructor to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    
    // Calculate the start of the week (Sunday)
    const startOfWeek = new Date(year, month, day - dayOfWeek);
    return startOfWeek;
  }

  // Generate days for the current week view
  function generateWeekDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
      return day
    })
  }

  const weekDays = generateWeekDays(currentWeekStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today to start of day for comparison

  // Navigate to previous week
  const goToPreviousWeek = () => {
    // Use local year/month/day constructor to avoid timezone issues
    const year = currentWeekStart.getFullYear();
    const month = currentWeekStart.getMonth();
    const day = currentWeekStart.getDate();
    const prevWeek = new Date(year, month, day - 7);

    // Don't allow navigating to weeks before the current week
    if (prevWeek >= getWeekStart(today)) {
      setCurrentWeekStart(prevWeek)
    }
  }

  // Navigate to next week
  const goToNextWeek = () => {
    // Use local year/month/day constructor to avoid timezone issues
    const year = currentWeekStart.getFullYear();
    const month = currentWeekStart.getMonth();
    const day = currentWeekStart.getDate();
    const nextWeek = new Date(year, month, day + 7);
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

  // Helper to format time in 12-hour AM/PM
  function formatTime12Hour(time: string) {
    if (!time || time === "ASAP") return time;
    // If already in AM/PM format, return as is
    if (/AM|PM/i.test(time)) return time;
    // Parse 24-hour time (e.g., 00:00, 13:30)
    const [h, m] = time.split(":").map(Number);
    let hour = h % 12;
    if (hour === 0) hour = 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  // Update available time slots based on selected date
  useEffect(() => {
    if (isToday(selectedDate)) {
      // For today, always show ASAP first, then regular slots with 30-min buffer
      const { index } = getNextTimeSlot() // Get slots 30+ minutes from now
      const futureTimeSlots = allTimeSlots.slice(index)
      
      // Always add "ASAP" as first option, then regular future slots
      const todayTimeSlots = ["ASAP", ...futureTimeSlots]
      setAvailableTimeSlots(todayTimeSlots)
      
      // Clear invalid time selections
      if (!selectedTime || !todayTimeSlots.includes(selectedTime)) {
        setInternalTime("") // Force user to select a valid time
      }
    } else {
      // For future dates, show all time slots (no ASAP option for future dates)
      setAvailableTimeSlots(allTimeSlots)

      // For future dates, clear time selection to force user to pick
      if (!allTimeSlots.includes(selectedTime)) {
        setInternalTime("") // Force user to select a time for future dates
      }
    }
  }, [selectedDate])

  // When controlled props change, update internal state for backward compatibility
  useEffect(() => {
    if (controlledDate && controlledDate.getTime() !== internalDate.getTime()) setInternalDate(controlledDate)
    if (controlledTime !== undefined && controlledTime !== internalTime) setInternalTime(controlledTime)
  }, [controlledDate, controlledTime])

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (!isPastDate(date)) {
      setInternalDate(date)
      setShowCalendar(false)
      onDateChange(date)
      setTimeout(() => {
        setShowTimeSelector(true)
      }, 150)
    }
  }

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setInternalTime(time)
    setShowTimeSelector(false)
    onTimeChange(time)
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
          <span>{selectedTime === "ASAP" ? "⚡ Now" : formatTime12Hour(selectedTime) || "Select time"}</span>
          <span className="ml-1">▼</span>
        </button>

        {showTimeSelector && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
            {availableTimeSlots.length > 0 ? (
              availableTimeSlots.map((time, index) => {
                // Special handling for "ASAP" option
                if (time === "ASAP") {
                  return (
                    <div key={time}>
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 text-sm border-b border-gray-100 ${
                          time === selectedTime ? "bg-gray-100" : ""
                        }`}
                        onClick={() => handleTimeSelect(time)}
                      >
                        ⚡ Now
                      </button>
                      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                        ℹ️ Arrival time may vary due to traffic
                      </div>
                    </div>
                  )
                }
                
                // Regular time slots
                return (
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
                )
              })
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No available times today</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
