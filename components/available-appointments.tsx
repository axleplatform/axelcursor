"use client"

import { useState } from "react"
import { MapPin, X, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { formatDate, formatCarIssue } from "@/lib/utils"
import type { Appointment } from "@/hooks/use-mechanic-appointments"
import { GoogleMapsLink } from "@/components/google-maps-link"

interface AvailableAppointmentsProps {
  appointments: Appointment[]
  isLoading: boolean
  onAccept: (id: string, price: number) => Promise<boolean>
  onDeny: (id: string) => Promise<boolean>
}

export default function AvailableAppointments({
  appointments,
  isLoading,
  onAccept,
  onDeny,
}: AvailableAppointmentsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [priceInput, setPriceInput] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Navigate through available appointments
  const goToNextAvailable = () => {
    if (appointments.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % appointments.length)
      setPriceInput("")
    }
  }

  const goToPrevAvailable = () => {
    if (appointments.length > 1) {
      setCurrentIndex((prev) => (prev === 0 ? appointments.length - 1 : prev - 1))
      setPriceInput("")
    }
  }

  const handleAccept = async (id: string) => {
    if (!priceInput || Number.parseFloat(priceInput) <= 0) {
      return false
    }

    setIsProcessing(true)
    const success = await onAccept(id, Number.parseFloat(priceInput))
    setIsProcessing(false)

    if (success) {
      setPriceInput("")
    }

    return success
  }

  const handleDeny = async (id: string) => {
    setIsProcessing(true)
    const success = await onDeny(id)
    setIsProcessing(false)
    return success
  }

  return (
    <div className="bg-[#294a46] rounded-lg shadow-sm p-6 text-white">
      <h2 className="text-xl font-semibold mb-6">Available Appointments</h2>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <Clock className="h-16 w-16 mb-4 text-white/70" />
          <h3 className="text-xl font-medium mb-2">No Available Appointments</h3>
          <p className="text-white/70">
            There are no pending appointments at this time. Check back later for new requests.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Navigation buttons for multiple appointments */}
          {appointments.length > 1 && (
            <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
              <button
                onClick={goToPrevAvailable}
                className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                aria-label="Previous appointment"
                disabled={isProcessing}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          )}

          {appointments.length > 1 && (
            <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
              <button
                onClick={goToNextAvailable}
                className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                aria-label="Next appointment"
                disabled={isProcessing}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Current appointment details */}
          {appointments[currentIndex] && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-medium text-gray-900">
                    {currentIndex + 1}
                  </div>
                  <GoogleMapsLink 
                    address={appointments[currentIndex].location}
                    latitude={appointments[currentIndex].latitude}
                    longitude={appointments[currentIndex].longitude}
                    variant="dark"
                  />
                </div>
                <button
                  onClick={() => handleDeny(appointments[currentIndex].id)}
                  className="text-gray-200 hover:text-white"
                  aria-label="Deny appointment"
                  disabled={isProcessing}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 flex justify-center">
                <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 w-fit bg-white">
                  <span className="text-2xl font-bold mr-2 text-gray-900">$</span>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Enter price"
                    className="border-none outline-none text-2xl font-bold bg-transparent w-32 text-gray-900"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="text-white mb-4 text-center">
                {formatDate(appointments[currentIndex].appointment_date)}
              </div>

              <div className="bg-[#e6eeec] p-4 rounded-md mb-4 text-gray-900">
                <div className="flex items-center justify-center mb-3">
                  <span className="mr-2">Does car run?</span>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    {appointments[currentIndex].car_runs ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : (
                      <X className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="ml-1">{appointments[currentIndex].car_runs ? "Yes" : "No"}</span>
                </div>

                {appointments[currentIndex].selected_services &&
                  appointments[currentIndex].selected_services!.length > 0 && (
                    <div className="mb-3">
                      <div className="font-semibold mb-1">Recommended Services:</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {appointments[currentIndex].selected_services!.map((service, index) => (
                          <li key={index}>{service}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {appointments[currentIndex].selected_car_issues &&
                  appointments[currentIndex].selected_car_issues!.length > 0 && (
                    <div className="mb-3">
                      <div className="font-semibold mb-1">Reported Issues:</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {appointments[currentIndex].selected_car_issues!.map((issue, index) => (
                          <span
                            key={index}
                            className="bg-orange-200/30 text-orange-100 text-xs px-3 py-1 rounded-full whitespace-nowrap"
                          >
                            {formatCarIssue(issue)}
                          </span>
                        ))}
                      </ul>
                    </div>
                  )}

                {appointments[currentIndex].issue_description && (
                  <div>
                    <div className="font-semibold mb-1">Customer Description:</div>
                    <p className="italic text-gray-700">"{appointments[currentIndex].issue_description}"</p>
                  </div>
                )}
              </div>

              {appointments[currentIndex].vehicles && (
                <div className="text-center mb-6">
                  <div className="font-semibold text-lg text-white">
                    {appointments[currentIndex].vehicles.year} {appointments[currentIndex].vehicles.make}{" "}
                    {appointments[currentIndex].vehicles.model}
                  </div>
                  {appointments[currentIndex].vehicles.vin && (
                    <div className="text-gray-200 text-sm">VIN: {appointments[currentIndex].vehicles.vin}</div>
                  )}
                  {appointments[currentIndex].vehicles.mileage && (
                    <div className="text-gray-200 text-sm">
                      Mileage: {appointments[currentIndex].vehicles.mileage} miles
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => handleAccept(appointments[currentIndex].id)}
                  disabled={isProcessing || !priceInput || Number.parseFloat(priceInput) <= 0}
                  className="bg-white text-[#294a46] font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-gray-100 hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-[#294a46] rounded-full mr-2"></span>
                      Processing...
                    </span>
                  ) : (
                    "Accept"
                  )}
                </button>
                <button
                  onClick={() => handleDeny(appointments[currentIndex].id)}
                  disabled={isProcessing}
                  className="border border-white text-white font-medium text-lg py-2 px-4 rounded-full transform transition-all duration-200 hover:scale-[1.01] hover:bg-[#1e3632] hover:shadow-md active:scale-[0.99] flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Processing...
                    </span>
                  ) : (
                    "Deny"
                  )}
                </button>
              </div>

              {appointments.length > 1 && (
                <div className="flex justify-center mt-4 gap-1">
                  {appointments.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentIndex ? "bg-white" : "bg-gray-300"}`}
                    ></div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
