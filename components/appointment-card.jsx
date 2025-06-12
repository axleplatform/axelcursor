"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Calendar, MapPin, Car, Wrench, AlertCircle, FileText, CreditCard, User } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export default function AppointmentCard({
  appointment,
  mechanicId,
  isUpcoming = false,
  isSelected = false,
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
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingQuoteId, setCancellingQuoteId] = useState(null)
  const supabase = createClient()

  // Find this mechanic's quote if it exists
  const myQuote = appointment.mechanic_quotes?.find(q => q.mechanic_id === mechanicId)
  const quoteDate = myQuote?.eta ? new Date(myQuote.eta).toISOString().split('T')[0] : ''
  const quoteTime = myQuote?.eta ? new Date(myQuote.eta).toTimeString().slice(0, 5) : ''

  const handleEdit = () => {
    setIsEditing(true)
    onEdit(appointment)
    setPrice(myQuote?.price.toString() || '')
    setSelectedDate(quoteDate)
    setSelectedTime(quoteTime)
    setNotes(myQuote?.notes || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    onCancel()
    setPrice('')
    setSelectedDate('')
    setSelectedTime('')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!price || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const eta = new Date(`${selectedDate}T${selectedTime}`)
      
      if (myQuote) {
        // Update existing quote
        const { error } = await supabase
          .from('mechanic_quotes')
          .update({
            price: parseFloat(price),
            eta: eta.toISOString(),
            notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', myQuote.id)
          .eq('mechanic_id', mechanicId)

        if (error) throw error
      } else {
        // Create new quote
        const { error } = await supabase
          .from('mechanic_quotes')
          .insert({
            appointment_id: appointment.id,
            mechanic_id: mechanicId,
            price: parseFloat(price),
            eta: eta.toISOString(),
            notes: notes,
            status: 'pending'
          })

        if (error) throw error
      }

      toast({
        title: "Success",
        description: myQuote ? "Quote updated successfully" : "Quote submitted successfully",
      })

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error("Error submitting quote:", error)
      toast({
        title: "Error",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelQuote = async (appointmentId, quoteId) => {
    if (!quoteId) return
    
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your quote? This will remove you from the customer\'s selection.'
    )
    
    if (!confirmCancel) return
    
    setCancellingQuoteId(quoteId)
    try {
      // Delete the quote
      const { error } = await supabase
        .from('mechanic_quotes')
        .delete()
        .eq('id', quoteId)
        .eq('mechanic_id', mechanicId) // Extra safety check
      
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Quote cancelled successfully",
      })
      
      // Refresh appointments - the appointment should move back to available
      onUpdate()
      
    } catch (error) {
      console.error('Error cancelling quote:', error)
      toast({
        title: "Error",
        description: "Failed to cancel quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCancellingQuoteId(null)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-white">
              <Image
                src={appointment.vehicles?.image_url || "/placeholder.svg"}
                alt={`${appointment.vehicles?.year} ${appointment.vehicles?.make} ${appointment.vehicles?.model}`}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {appointment.vehicles?.year} {appointment.vehicles?.make} {appointment.vehicles?.model}
              </h3>
              <p className="text-sm text-gray-500">{appointment.vehicles?.color}</p>
            </div>
          </div>
          <Badge variant={appointment.status === "pending" ? "default" : "secondary"}>
            {appointment.status === "pending" ? "Pending" : "Completed"}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-700 text-sm">Appointment Details</h3>
              <p className="text-xs text-gray-600">{formatDate(appointment.appointment_date)}</p>
              <div className="flex items-start mt-1">
                <MapPin className="h-3 w-3 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                <p className="text-xs text-gray-500">{appointment.location}</p>
              </div>
            </div>
          </div>

          {appointment.selected_services && appointment.selected_services.length > 0 && (
            <div className="flex items-start space-x-3">
              <Wrench className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700 text-sm">Requested Services</h3>
                <ul className="mt-1 space-y-1">
                  {appointment.selected_services.map((service, index) => (
                    <li key={index} className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                      <span className="text-xs text-gray-600">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {appointment.selected_car_issues && appointment.selected_car_issues.length > 0 && (
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700 text-sm">Reported Issues</h3>
                <ul className="mt-1 space-y-1">
                  {appointment.selected_car_issues.map((issue, index) => (
                    <li key={index} className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#294a46] mr-2"></div>
                      <span className="text-xs text-gray-600">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {appointment.issue_description && (
            <div className="flex items-start space-x-3">
              <FileText className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700 text-sm">Description</h3>
                <p className="text-xs text-gray-600 mt-1">{appointment.issue_description}</p>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <Car className="h-4 w-4 text-[#294a46] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-700 text-sm">Car Status</h3>
              <p className="text-xs text-gray-600 mt-1">
                {appointment.car_runs !== null
                  ? appointment.car_runs
                    ? "Car is running"
                    : "Car is not running"
                  : "Car status not specified"}
              </p>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                placeholder="Enter price"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Time</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#294a46]"
                rows={3}
                placeholder="Add any additional notes or details"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-[#294a46] hover:bg-[#1e3632] text-white"
              >
                {isSubmitting ? "Submitting..." : myQuote ? "Update Quote" : "Submit Quote"}
              </Button>
              <Button
                onClick={handleCancel}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {isUpcoming && !isSelected && !isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Edit Quote
                </button>
                <button
                  onClick={() => handleCancelQuote(appointment.id, myQuote?.id)}
                  disabled={cancellingQuoteId === myQuote?.id}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancellingQuoteId === myQuote?.id ? 'Cancelling...' : 'Cancel Quote'}
                </button>
              </div>
            )}
            {!isUpcoming && !isSelected && !isEditing && (
              <Button
                onClick={handleEdit}
                className="w-full bg-[#294a46] hover:bg-[#1e3632] text-white"
              >
                Submit Quote
              </Button>
            )}
            {isSelected && !isEditing && (
              <div className="flex gap-3">
                <Button
                  onClick={handleEdit}
                  className="flex-1 bg-[#294a46] hover:bg-[#1e3632] text-white"
                >
                  Edit Quote
                </Button>
                <Button
                  onClick={onSkip}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
} 