"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { AppointmentWithRelations } from "@/types"

interface MechanicScheduleProps {
  upcomingAppointments: AppointmentWithRelations[]
  availableAppointments: AppointmentWithRelations[]
  onAppointmentClick?: (appointment: AppointmentWithRelations) => void
}

export default function MechanicSchedule({ 
  upcomingAppointments, 
  availableAppointments, 
  onAppointmentClick 
}: MechanicScheduleProps) {
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

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD format
    
    const appointments: Array<{
      appointment: AppointmentWithRelations
      status: 'pending' | 'confirmed'
      time: string
    }> = []

    // Check upcoming appointments (confirmed)
    upcomingAppointments.forEach(appointment => {
      const myQuote = appointment.mechanic_quotes?.[0]
      if (myQuote?.eta) {
        const etaDate = new Date(myQuote.eta)
        const etaDateString = etaDate.toISOString().split('T')[0]
        
        if (etaDateString === dateString) {
          appointments.push({
            appointment,
            status: 'confirmed',
            time: etaDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          })
        }
      }
    })

    // Check available appointments (pending)
    availableAppointments.forEach(appointment => {
      const myQuote = appointment.mechanic_quotes?.[0]
      if (myQuote?.eta) {
        const etaDate = new Date(myQuote.eta)
        const etaDateString = etaDate.toISOString().split('T')[0]
        
        if (etaDateString === dateString) {
          appointments.push({
            appointment,
            status: 'pending',
            time: etaDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          })
        }
      }
    })

    return appointments.sort((a, b) => a.time.localeCompare(b.time))
  }

  // Handle appointment click
  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    if (onAppointmentClick) {
      onAppointmentClick(appointment)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Schedule</h2>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm">Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
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

        {weekDays.map((day, index) => {
          const appointments = getAppointmentsForDate(day)
          return (
            <div key={`day-${index}`} className="relative">
              <div className={`text-sm font-medium ${isToday(day) ? "text-[#294a46]" : ""}`}>
                {day.getDate()}
              </div>
              {appointments.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {appointments.length}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {weekDays.map((day, index) => {
          const appointments = getAppointmentsForDate(day)
          return (
            <div
              key={`details-${index}`}
              className={`border border-gray-100 rounded-md p-3 ${isToday(day) ? "bg-green-50" : ""}`}
            >
              <div className="font-medium mb-2">{day.toLocaleDateString("en-US", { weekday: "long" })}</div>
              
              {appointments.length === 0 ? (
                <div className="text-sm text-gray-500">No appointments</div>
              ) : (
                <div className="space-y-2">
                  {appointments.map(({ appointment, status, time }, appointmentIndex) => {
                    const myQuote = appointment.mechanic_quotes?.[0]
                    return (
                      <div
                        key={`appointment-${appointment.id}-${appointmentIndex}`}
                        className={`p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-50 ${
                          status === 'confirmed' 
                            ? 'bg-[#294a46]/10 border border-[#294a46]/20' 
                            : 'bg-yellow-400/10 border border-yellow-400/20'
                        }`}
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{time}</span>
                          <div className="flex items-center gap-2">
                            {/* Location Pin */}
                            <button 
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Future: Handle location click
                              }}
                            >
                              <MapPin className="h-3 w-3 text-gray-500" />
                            </button>
                            {/* Quote */}
                            {myQuote && (
                              <span className="text-xs font-medium text-gray-700">
                                ${myQuote.price.toFixed(2)}
                              </span>
                            )}
                            {/* Status Dot */}
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {appointment.vehicles ? 
                            `${appointment.vehicles.year} ${appointment.vehicles.make} ${appointment.vehicles.model}` :
                            'Vehicle info unavailable'
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
