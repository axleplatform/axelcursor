import { supabase } from "@/lib/supabase"
import { validateMechanicId } from "@/lib/utils"

interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  car_runs?: boolean
  selected_services?: string[]
  vehicles?: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  }
  quote?: {
    id: string
    price: number
    created_at: string
  }
}

export interface MechanicQuote {
  id: string
  appointment_id: string
  mechanic_id: string
  price: number
  eta?: string
  notes?: string
  created_at: string
  updated_at: string
  status: "pending" | "accepted" | "rejected"
  mechanic?: {
    id: string
    first_name: string
    last_name: string
    profile_image_url: string | null
    metadata: Record<string, any>
    rating: number
    review_count: number
  }
}

/**
 * Creates or updates a quote from a mechanic for an appointment
 */
export async function createOrUpdateQuote(
  mechanicId: string,
  appointmentId: string,
  price: number,
  eta: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if the appointment is still available for quoting
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", appointmentId)
      .single()

    if (appointmentError) {
      console.error("Error checking appointment status:", appointmentError)
      return { success: false, error: "Failed to check appointment status" }
    }

    if (!appointment || appointment.status !== "pending") {
      return { success: false, error: "Appointment is no longer available for quoting" }
    }

    // Check if mechanic already has a quote for this appointment
    const { data: existingQuote, error: quoteError } = await supabase
      .from("mechanic_quotes")
      .select("id")
      .eq("mechanic_id", mechanicId)
      .eq("appointment_id", appointmentId)
      .single()

    if (quoteError && quoteError.code !== "PGRST116") {
      console.error("Error checking existing quote:", quoteError)
      return { success: false, error: "Failed to check existing quote" }
    }

    const now = new Date().toISOString()

    if (existingQuote) {
      // Update existing quote
      const { error: updateError } = await supabase
        .from("mechanic_quotes")
        .update({
          price,
          eta,
          notes,
          status: "pending",
          updated_at: now
        })
        .eq("id", existingQuote.id)

      if (updateError) {
        console.error("Error updating quote:", updateError)
        return { success: false, error: "Failed to update quote" }
      }
    } else {
      // Create new quote
      const { error: insertError } = await supabase
        .from("mechanic_quotes")
        .insert({
          mechanic_id: mechanicId,
          appointment_id: appointmentId,
          price,
          eta,
          notes,
          status: "pending"
        })

      if (insertError) {
        console.error("Error creating quote:", insertError)
        return { success: false, error: "Failed to create quote" }
      }
    }

    return { success: true }
  } catch (err) {
    console.error("Exception in createOrUpdateQuote:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Gets all quotes for an appointment with real-time updates
 */
export async function getQuotesForAppointment(appointmentId: string): Promise<{
  success: boolean
  quotes?: MechanicQuote[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("mechanic_quotes")
      .select(`
        *,
        mechanic:mechanic_id(
          id,
          first_name,
          last_name,
          profile_image_url,
          metadata,
          rating,
          review_count
        )
      `)
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error getting quotes for appointment:", error)
      return { success: false, error: "Failed to get quotes" }
    }

    return { success: true, quotes: data }
  } catch (err) {
    console.error("Exception in getQuotesForAppointment:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Gets all available appointments for a mechanic to quote
 */
export async function getAvailableAppointmentsForMechanic(mechanicId: string): Promise<{ success: boolean; appointments?: Appointment[]; error?: string }> {
  try {
    console.log("🔍 getAvailableAppointmentsForMechanic called with:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })

    // Validate mechanic ID
    const validation = validateMechanicId(mechanicId)
    if (!validation.isValid) {
      console.error("❌ Mechanic ID validation failed:", validation.error)
      return { success: false, error: validation.error }
    }

    console.log("✅ mechanicId validation passed:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })
    
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*, vehicles(*)")
      .eq("status", "pending")
      .order("appointment_date", { ascending: true })

    if (error) {
      console.error("❌ Error fetching appointments:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Found available appointments:", { count: appointments?.length || 0 })
    return { success: true, appointments: appointments || [] }
  } catch (error: any) {
    console.error("❌ Error getting available appointments:", { 
      error, 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })
    return { success: false, error: error.message }
  }
}

/**
 * Gets all appointments a mechanic has quoted
 */
export async function getQuotedAppointmentsForMechanic(mechanicId: string): Promise<{ success: boolean; appointments?: Appointment[]; error?: string }> {
  try {
    console.log("🔍 getQuotedAppointmentsForMechanic called with:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })

    // Validate mechanic ID
    const validation = validateMechanicId(mechanicId)
    if (!validation.isValid) {
      console.error("❌ Mechanic ID validation failed:", validation.error)
      return { success: false, error: validation.error }
    }

    console.log("✅ mechanicId validation passed:", { 
      mechanicId, 
      type: typeof mechanicId,
      isString: typeof mechanicId === 'string',
      length: typeof mechanicId === 'string' ? mechanicId.length : 0,
      isZero: mechanicId === '0'
    })
    
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*, vehicles(*), mechanic_quotes!inner(*)")
      .eq("mechanic_quotes.mechanic_id", mechanicId)
      .order("appointment_date", { ascending: true })

    if (error) {
      console.error("❌ Error fetching quoted appointments:", error)
      return { success: false, error: error.message }
    }

    // Transform the data to match the Appointment interface
    const transformedAppointments = appointments?.map((appointment: any) => ({
      ...appointment,
      quote: appointment.mechanic_quotes?.[0] ? {
        id: appointment.mechanic_quotes[0].id,
        price: appointment.mechanic_quotes[0].price,
        created_at: appointment.mechanic_quotes[0].created_at
      } : undefined
    })) || []

    console.log("✅ Found quoted appointments:", { 
      count: transformedAppointments.length,
      mechanicId,
      type: typeof mechanicId
    })
    return { success: true, appointments: transformedAppointments }
  } catch (error: any) {
    console.error("❌ Error getting quoted appointments:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Selects a quote for an appointment and updates all related records
 */
export async function selectQuoteForAppointment(
  appointmentId: string,
  quoteId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc("begin_transaction")
    if (transactionError) throw transactionError

    // Get the quote details
    const { data: quote, error: quoteError } = await supabase
      .from("mechanic_quotes")
      .select("*")
      .eq("id", quoteId)
      .single()

    if (quoteError) throw quoteError

    const now = new Date().toISOString()

    // Update the appointment with the selected quote
    const { error: appointmentError } = await supabase
      .from("appointments")
      .update({
        selected_quote_id: quoteId,
        mechanic_id: quote.mechanic_id,
        status: "confirmed",
        price: quote.price,
        updated_at: now,
      })
      .eq("id", appointmentId)

    if (appointmentError) throw appointmentError

    // Update the selected quote status
    const { error: quoteUpdateError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "accepted",
        updated_at: now,
      })
      .eq("id", quoteId)

    if (quoteUpdateError) throw quoteUpdateError

    // Reject all other quotes for this appointment
    const { error: rejectError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "rejected",
        updated_at: now,
      })
      .eq("appointment_id", appointmentId)
      .neq("id", quoteId)

    if (rejectError) throw rejectError

    // Commit the transaction
    const { error: commitError } = await supabase.rpc("commit_transaction")
    if (commitError) throw commitError

    return { success: true }
  } catch (err) {
    // Rollback on error
    await supabase.rpc("rollback_transaction")
    console.error("Exception in selectQuoteForAppointment:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Accepts a quote and updates the appointment status
 */
export async function acceptQuote(
  quoteId: string,
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc("begin_transaction")
    if (transactionError) throw transactionError

    // Get the quote details
    const { data: quote, error: quoteError } = await supabase
      .from("mechanic_quotes")
      .select("mechanic_id, price")
      .eq("id", quoteId)
      .eq("appointment_id", appointmentId)
      .single()

    if (quoteError) {
      throw new Error("Quote not found")
    }

    const now = new Date().toISOString()

    // Update the quote status to accepted
    const { error: updateQuoteError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "accepted",
        updated_at: now,
      })
      .eq("id", quoteId)

    if (updateQuoteError) {
      throw new Error("Failed to update quote status")
    }

    // Update the appointment status and assign the mechanic
    const { error: updateAppointmentError } = await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        mechanic_id: quote.mechanic_id,
        selected_quote_id: quoteId,
        price: quote.price,
        updated_at: now,
      })
      .eq("id", appointmentId)

    if (updateAppointmentError) {
      // Try to revert the quote status if appointment update fails
      await supabase
        .from("mechanic_quotes")
        .update({
          status: "pending",
          updated_at: now,
        })
        .eq("id", quoteId)
      throw new Error("Failed to update appointment status")
    }

    // Reject all other quotes for this appointment
    const { error: rejectQuotesError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "rejected",
        updated_at: now,
      })
      .eq("appointment_id", appointmentId)
      .neq("id", quoteId)

    if (rejectQuotesError) {
      console.error("Error rejecting other quotes:", rejectQuotesError)
      // Don't fail the whole operation if this fails
    }

    // Commit the transaction
    const { error: commitError } = await supabase.rpc("commit_transaction")
    if (commitError) throw commitError

    return { success: true }
  } catch (error) {
    // Rollback on error
    await supabase.rpc("rollback_transaction")
    console.error("Error in acceptQuote:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}
