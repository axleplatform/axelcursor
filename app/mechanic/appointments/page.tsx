"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, MapPin, Clock, Search } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"
import type { AppointmentWithRelations } from "@/types"

export default function MechanicAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        setCurrentUser(user)
        await fetchAppointments(user.id)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const fetchAppointments = async (userId: string) => {
    try {
      setIsLoading(true)
      
      // Get mechanic profile to get mechanic_id
      const { data: mechanicProfile, error: profileError } = await supabase
        .from('mechanic_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (profileError || !mechanicProfile) {
        console.error('Error fetching mechanic profile:', profileError)
        return
      }

      // Fetch all appointments with related data
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicles!fk_appointment_id(*),
          mechanic_quotes!fk_appointment_id(*)
        `)
        .order('appointment_date', { ascending: true })

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError)
        return
      }

        // Filter appointments where this mechanic has quoted or is selected
  const filteredAppointments = appointmentsData.filter((appointment: any) => {
                  const hasQuoted = appointment.mechanic_quotes?.some((quote: any) => quote.mechanic_id === mechanicProfile.id)
        const isSelected = appointment.selected_mechanic_id === mechanicProfile.id
        return hasQuoted || isSelected
      })

      setAppointments(filteredAppointments)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter appointments based on search query and status
  const filteredAppointments = appointments.filter((appointment: any) => {
    const matchesSearch = searchQuery === "" || 
      appointment.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.vehicles?.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.vehicles?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.vehicles?.year?.toString().includes(searchQuery)

    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-orange-100 text-orange-800"
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
      case "pending":
        return "Pending"
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

  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    // Navigate to dashboard with the appointment selected
    router.push(`/mechanic/dashboard?appointment_id=${appointment.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a46] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/mechanic/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">All Appointments</h1>
              <p className="text-gray-600 mt-1">
                View and manage all your appointments in one place
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by location, make, model, or year..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#294a46] focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <div className="text-4xl mb-4">📅</div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== "all" ? "No appointments found" : "No appointments yet"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Start by accepting available appointments from your dashboard."
                  }
                </p>
              </div>
            ) : (
              filteredAppointments.map((appointment) => {
                const myQuote = appointment.mechanic_quotes?.[0]
                const isSelected = appointment.selected_mechanic_id === myQuote?.mechanic_id
                
                return (
                  <div
                    key={appointment.id}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left side - Appointment details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                          {myQuote && (
                            <span className="text-lg font-bold text-[#294a46]">
                              ${myQuote.price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Location and Date */}
                        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(appointment.appointment_date)}</span>
                          </div>
                        </div>

                        {/* Vehicle Information */}
                        {appointment.vehicles && (
                          <div className="mb-3">
                            <div className="text-lg font-semibold text-gray-900">
                              {appointment.vehicles.year} {appointment.vehicles.make} {appointment.vehicles.model}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {appointment.vehicles.vin && (
                                <span>VIN: {appointment.vehicles.vin}</span>
                              )}
                              {appointment.vehicles.mileage && (
                                <span>{appointment.vehicles.mileage.toLocaleString()} miles</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Services and Issues */}
                        <div className="flex flex-wrap gap-2">
                          {appointment.selected_services?.map((service, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                            >
                              {service}
                            </span>
                          ))}
                        </div>

                        {/* Car Status */}
                        {appointment.car_runs !== null && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${appointment.car_runs ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm text-gray-600">
                              Car {appointment.car_runs ? 'is running' : 'is not running'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex flex-col gap-2 lg:items-end">
                        {myQuote?.eta && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">ETA:</span> {formatDate(myQuote.eta)}
                          </div>
                        )}
                        {myQuote?.notes && (
                          <div className="text-sm text-gray-600 max-w-xs">
                            <span className="font-medium">Notes:</span> {myQuote.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
