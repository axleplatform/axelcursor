// Vehicle interface
export interface Vehicle {
  id?: string
  year: string
  make: string
  model: string
  vin?: string
  mileage?: number
}

// Mechanic Quote interface
export interface MechanicQuote {
  id: string
  mechanic_id: string
  appointment_id?: string
  price: number
  eta: string
  notes?: string
  created_at: string
  updated_at?: string
}

// Mechanic Skip interface
export interface MechanicSkip {
  id?: string
  mechanic_id: string
  appointment_id: string
  skipped_at: string
}

// Appointment interface with all properties used in the dashboard
export interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  selected_car_issues?: string[]
  car_runs?: boolean
  selected_services?: string[]
  payment_status?: string
  notes?: string
  selected_mechanic_id?: string
  created_at?: string
  updated_at?: string
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  cancellation_fee?: string
  started_at?: string
  mechanic_eta?: string
  vehicles?: Vehicle
  mechanic_quotes?: MechanicQuote[]
  mechanic_skips?: MechanicSkip[]
  quote?: {
    id: string
    price: number
    created_at: string
  }
}

// Mechanic Profile interface
export interface MechanicProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

// Notification interface for the notification system
export interface NotificationState {
  type: 'success' | 'error' | 'info' | 'skip'
  message: string
}

// Date/Time slot interfaces for the UI components
export interface DateOption {
  value: string
  label: string
}

export interface TimeSlot {
  value: string
  label: string
}

// Event handler types for form elements
export interface SelectChangeEvent {
  target: {
    value: string
  }
}

export interface InputChangeEvent {
  target: {
    value: string
  }
}

// Component prop interfaces
export interface UpcomingAppointmentsProps {
  appointments: Appointment[]
  isLoading: boolean
  onStart: (id: string) => Promise<boolean>
  onCancel: (id: string) => Promise<boolean>
  onUpdatePrice: (id: string, price: number) => Promise<boolean>
}

export interface AppointmentWithRelations {
  id: string
  status: string
  appointment_date: string
  location: string
  phone_number?: string
  issue_description?: string
  selected_car_issues?: string[]
  selected_services?: string[]
  car_runs?: boolean
  payment_status?: string
  selected_mechanic_id?: string
  vehicles?: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  } | null
  mechanic_quotes?: Array<{
    id: string
    mechanic_id: string
    price: number
    eta: string
    notes?: string
    created_at: string
  }>
  quote?: {
    id: string
    price: number
    created_at: string
  }
}
