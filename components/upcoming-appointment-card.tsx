"use client"

import { useState } from "react"
import { Check, MapPin, X } from "lucide-react"
import type { Appointment } from "@/hooks/use-appointments"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

interface UpcomingAppointmentCardProps {
  appointment: Appointment
  onStart: (id: string) => Promise<boolean>
  onComplete: (id: string) => Promise<boolean>
  onCancel: (id: string) => Promise<boolean>
  onUpdatePrice: (id: string, price: number) => Promise<boolean>
  currentIndex: number
  totalAppointments: number
}

export default function UpcomingAppointmentCard({
  appointment,
  onStart,
  onComplete,
  onCancel,
  onUpdatePrice,
  currentIndex,
  totalAppointments,
}: UpcomingAppointmentCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [price, setPrice] = useState(appointment.price || 0)
  const supabase = createClient()

  const handleStart = async () => {
    setIsProcessing(true)
    const success = await onStart(appointment.id)
    setIsProcessing(false)
    return success
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    const success = await onComplete(appointment.id)
    setIsProcessing(false)
    return success
  }

  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      // Check if appointment is paid
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select('payment_status')
        .eq('id', appointment.id)
        .single()
      
      if (fetchError) throw fetchError
      
      if (appointmentData?.payment_status === 'paid') {
        toast({
          title: "Error",
          description: "Cannot cancel paid appointments",
          variant: "destructive",
        })
        return false
      }
      
      const success = await onCancel(appointment.id)
      if (success) {
        toast({
          title: "Success",
          description: "Appointment cancelled successfully",
        })
      }
      return success
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePriceUpdate = async () => {
    setIsProcessing(true)
    const success = await onUpdatePrice(appointment.id, price)
    setIsProcessing(false)
    if (success) {
      setIsEditingPrice(false)
    }
    return success
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      default:
        return status
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <span className="text-gray-700">{appointment.location}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
          {getStatusText(appointment.status)}
        </span>
      </div>

      <div className="flex justify-center w-full mb-4">
        {isEditingPrice ? (
          <div className="flex items-center">
            <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 w-fit bg-white">
              <span className="text-2xl font-bold mr-2 text-gray-900">$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="border-none outline-none text-2xl font-bold bg-transparent w-32 text-gray-900"
                autoFocus
              />
            </div>
            <button onClick={handlePriceUpdate} className="ml-2 bg-[#294a46] text-white px-2 py-1 rounded-md">
              Save
            </button>
          </div>
        ) : (
          <div
            className="bg-[#294a46] text-white text-2xl font-bold py-2 px-4 rounded-md cursor-pointer"
            onClick={() => setIsEditingPrice(true)}
          >
            {appointment.price ? `$${appointment.price}` : "Set Price"}
          </div>
        )}
      </div>

      <div className="text-gray-700 mb-4 text-center">{formatDate(appointment.appointment_date)}</div>

      <div className="bg-[#e6eeec] p-4 rounded-md mb-4">
        <div className="flex items-center justify-center mb-3">
          <span className="mr-2">Does car run?</span>
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            {appointment.car_runs ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-white" />}
          </div>
          <span className="ml-1">{appointment.car_runs ? "Yes" : "No"}</span>
        </div>

        {appointment.selected_services && appointment.selected_services.length > 0 && (
          <div className="mb-3">
            <div className="font-semibold mb-1">Recommended Services:</div>
            <ul className="list-disc pl-5 space-y-1">
              {appointment.selected_services.map((service, index) => (
                <li key={index}>{service}</li>
              ))}
            </ul>
          </div>
        )}

        {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 && (
          <div className="mb-3">
            <div className="font-semibold mb-1">Reported Issues:</div>
            <ul className="list-disc pl-5 space-y-1">
              {appointment.selected_car_issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {appointment.issue_description && (
          <div>
            <div className="font-semibold mb-1">Customer Description:</div>
            <p className="italic text-gray-700">"{appointment.issue_description}"</p>
          </div>
        )}
      </div>

      {appointment.vehicles && (
        <div className="text-center mb-6">
          <div className="font-semibold text-lg">
            {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
          </div>
          {appointment.vehicles.vin && <div className="text-gray-600 text-sm">VIN: {appointment.vehicles.vin}</div>}
          {appointment.vehicles.mileage && (
            <div className="text-gray-600 text-sm">Mileage: {appointment.vehicles.mileage} miles</div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        {appointment.status === "confirmed" && (
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="bg-[#294a46] text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Processing...
              </span>
            ) : (
              "Start"
            )}
          </button>
        )}

        {appointment.status === "in_progress" && (
          <button
            onClick={handleComplete}
            disabled={isProcessing}
            className="bg-green-600 text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Processing...
              </span>
            ) : (
              "Complete"
            )}
          </button>
        )}

        {appointment.status !== "completed" && appointment.status !== "cancelled" && (
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-gray-700 rounded-full mr-2"></span>
                Processing...
              </span>
            ) : (
              "Cancel"
            )}
          </button>
        )}
      </div>

      <div className="flex justify-center mt-4 gap-1">
        {Array.from({ length: totalAppointments }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${index === currentIndex ? "bg-[#294a46]" : "bg-gray-300"}`}
          ></div>
        ))}
      </div>
    </div>
  )
}
