"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Appointment } from "@/hooks/use-appointments"
import UpcomingAppointmentCard from "@/components/upcoming-appointment-card"

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
  isLoading: boolean
  onStart: (id: string) => Promise<boolean>
  onCancel: (id: string) => Promise<boolean>
  onUpdatePrice: (id: string, price: number) => Promise<boolean>
}

export function UpcomingAppointments({
  appointments,
  isLoading,
  onStart,
  onCancel,
  onUpdatePrice,
}: UpcomingAppointmentsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filter to only show confirmed or in_progress appointments
  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.status === "confirmed" || appointment.status === "in_progress",
  )

  const nextAppointment = () => {
    if (currentIndex < upcomingAppointments.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevAppointment = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Appointments</h2>
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46]"></div>
        </div>
      </div>
    )
  }

  if (upcomingAppointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Appointments</h2>
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
          <p className="text-center mb-4">No upcoming appointments</p>
          <p className="text-center text-sm">Check available appointments to accept new jobs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
        {upcomingAppointments.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={prevAppointment}
              disabled={currentIndex === 0}
              className={`p-1 rounded-full ${currentIndex === 0 ? "text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextAppointment}
              disabled={currentIndex === upcomingAppointments.length - 1}
              className={`p-1 rounded-full ${
                currentIndex === upcomingAppointments.length - 1 ? "text-gray-300" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <UpcomingAppointmentCard
        appointment={upcomingAppointments[currentIndex]}
        onStart={onStart}
        onCancel={onCancel}
        onUpdatePrice={onUpdatePrice}
        currentIndex={currentIndex}
        totalAppointments={upcomingAppointments.length}
      />
    </div>
  )
}
