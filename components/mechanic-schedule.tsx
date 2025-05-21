"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function MechanicSchedule() {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())

  // Get the start of the week (Monday)
  const getStartOfWeek = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(date.setDate(diff))
  }

  // Format date range for display
  const formatDateRange = (startDate: Date) => {
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    const startMonth = startDate.toLocaleString("default", { month: "long" })
    const endMonth = endDate.toLocaleString("default", { month: "long" })

    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    const year = startDate.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  // Get the days of the week
  const startOfWeek = getStartOfWeek(new Date(currentWeek))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  // Check if a day is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Schedule</h2>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#294a46]"></div>
          <span className="text-sm">Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-sm">Pending</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={goToPreviousWeek} className="p-1 rounded-full hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <span className="font-medium">{formatDateRange(startOfWeek)}</span>
        </div>
        <button onClick={goToNextWeek} className="p-1 rounded-full hover:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
          <div key={`header-${index}`} className="text-xs text-gray-500">
            {day}
          </div>
        ))}

        {weekDays.map((day, index) => (
          <div key={`day-${index}`} className={`text-sm font-medium ${isToday(day) ? "text-[#294a46]" : ""}`}>
            {day.getDate()}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {weekDays.map((day, index) => (
          <div
            key={`details-${index}`}
            className={`border border-gray-100 rounded-md p-3 ${isToday(day) ? "bg-green-50" : ""}`}
          >
            <div className="font-medium mb-1">{day.toLocaleDateString("en-US", { weekday: "long" })}</div>
            <div className="text-sm text-gray-500">No appointments</div>
          </div>
        ))}
      </div>
    </div>
  )
}
