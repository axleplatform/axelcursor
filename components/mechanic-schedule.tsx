"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { AppointmentWithRelations } from "@/types"
import { GoogleMapsLink } from "@/components/google-maps-link"

interface MechanicScheduleProps {
  upcomingAppointments: AppointmentWithRelations[]
  availableAppointments: AppointmentWithRelations[]
  onAppointmentClick?: (appointment: AppointmentWithRelations) => void
  isPastETA?: (appointment: AppointmentWithRelations) => boolean
}

export default function MechanicSchedule({ 
  upcomingAppointments, 
  availableAppointments, 
  onAppointmentClick,
  isPastETA
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
      status: 'pending' | 'confirmed' | 'cancelled'
      time: string
    }> = []

    // Check all appointments and determine status based on selected_mechanic_id
    const allAppointments = [...upcomingAppointments, ...availableAppointments]
    
    allAppointments.forEach(appointment => {
      const myQuote = appointment.mechanic_quotes?.[0]
      if (myQuote?.eta) {
        const etaDate = new Date(myQuote.eta)
        const etaDateString = etaDate.toISOString().split('T')[0]
        
        if (etaDateString === dateString) {
          // Check if appointment is cancelled first
          if (appointment.status === 'cancelled') {
            appointments.push({
              appointment,
              status: 'cancelled',
              time: etaDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
            })
          } else {
            // Determine if this appointment is confirmed (customer selected this mechanic)
            const isConfirmed = appointment.selected_mechanic_id === myQuote.mechanic_id
            
            appointments.push({
              appointment,
              status: isConfirmed ? 'confirmed' : 'pending',
              time: etaDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
            })
          }
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
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#294a46' }}></div>
          <span className="text-sm">Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-sm">Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm">Cancelled</span>
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
                <div className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center border border-white shadow-sm">
                  <span className="text-[10px] font-semibold leading-none">
                    {appointments.length > 9 ? '9+' : appointments.length}
                  </span>
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
                            : status === 'cancelled'
                            ? 'bg-red-100 border border-red-200 opacity-75'
                            : 'bg-yellow-400/10 border border-yellow-400/20'
                        }`}
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${status === 'cancelled' ? 'line-through' : ''}`}>
                              {time}
                            </span>
                            {status === 'cancelled' && (
                              <span className="text-xs text-red-600 font-medium">cancelled</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Location Pin */}
                            <GoogleMapsLink 
                              address={appointment.location}
                              latitude={appointment.latitude}
                              longitude={appointment.longitude}
                            />
                            {/* Quote */}
                            {myQuote && (
                              <span className={`text-xs font-medium ${status === 'cancelled' ? 'text-red-600' : 'text-gray-700'}`}>
                                ${myQuote.price.toFixed(2)}
                              </span>
                            )}
                            {/* Status Dot */}
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'confirmed' ? 'bg-[#294a46]' : 
                              status === 'cancelled' ? 'bg-red-500' : 
                              'bg-yellow-500'
                            }`}></div>
                          </div>
                        </div>
                        <div className={`text-xs ${status === 'cancelled' ? 'text-red-600 line-through' : 'text-gray-600'} truncate`}>
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
