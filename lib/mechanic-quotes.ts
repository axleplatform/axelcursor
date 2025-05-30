import { supabase } from "@/lib/supabase"

export interface MechanicQuote {
  id: string
  appointment_id: string
  mechanic_id: string
  price: number
  eta?: string
  notes?: string
  created_at: string
  updated_at: string
  status?: "pending" | "accepted" | "rejected"
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

    // Create or update the quote
    const { error: quoteError } = await supabase
      .from("mechanic_quotes")
      .upsert({
        mechanic_id: mechanicId,
        appointment_id: appointmentId,
        price,
        eta,
        notes,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (quoteError) {
      console.error("Error creating/updating quote:", quoteError)
      return { success: false, error: "Failed to create/update quote" }
    }

    // Update appointment status to quoted
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "quoted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)

    if (updateError) {
      console.error("Error updating appointment status:", updateError)
      return { success: false, error: "Failed to update appointment status" }
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
export async function getAvailableAppointmentsForMechanic(mechanicId: string): Promise<{
  success: boolean
  appointments?: any[]
  error?: string
}> {
  try {
    console.log("Fetching available appointments for mechanic:", mechanicId)

    // Get IDs of appointments this mechanic has already quoted
    const { data: existingQuotes, error: quotesError } = await supabase
      .from("mechanic_quotes")
      .select("appointment_id")
      .eq("mechanic_id", mechanicId)

    if (quotesError) {
      console.error("Error getting existing quotes:", quotesError)
      return { success: false, error: "Failed to get existing quotes" }
    }

    // Get IDs of appointments this mechanic has already quoted
    const quotedAppointmentIds = existingQuotes?.map((q: { appointment_id: string }) => q.appointment_id) || []
    console.log("Appointments already quoted by mechanic:", quotedAppointmentIds)

    // Fetch available appointments (pending, not quoted by this mechanic yet)
    const { data: availableData, error: availableError } = await supabase
      .from("appointments")
      .select(`
        *,
        vehicles(*)
      `)
      .eq("status", "pending")
      .not("id", "in", quotedAppointmentIds.length > 0 ? `(${quotedAppointmentIds.join(",")})` : "(0)")
      .order("created_at", { ascending: false }) // Show newest appointments first

    if (availableError) {
      console.error("Error getting available appointments:", availableError)
      return { success: false, error: "Failed to get available appointments" }
    }

    // Log the results for debugging
    console.log("Available appointments for mechanic:", {
      mechanicId,
      totalAppointments: availableData?.length || 0,
      quotedAppointmentIds,
      firstAppointment: availableData?.[0],
      query: {
        status: "pending",
        excludedIds: quotedAppointmentIds,
        orderBy: "created_at DESC"
      }
    })

    return { success: true, appointments: availableData }
  } catch (err) {
    console.error("Exception in getAvailableAppointmentsForMechanic:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Gets all appointments a mechanic has quoted
 */
export async function getQuotedAppointmentsForMechanic(mechanicId: string): Promise<{
  success: boolean
  appointments?: any[]
  error?: string
}> {
  try {
    // Get IDs of appointments this mechanic has quoted
    const { data: quotes, error: quotesError } = await supabase
      .from("mechanic_quotes")
      .select(`
        *,
        appointment:appointment_id(
          *,
          vehicles(*)
        )
      `)
      .eq("mechanic_id", mechanicId)

    if (quotesError) {
      console.error("Error getting quotes:", quotesError)
      return { success: false, error: "Failed to get quotes" }
    }

    // Format the data to match the expected structure
    const appointments =
      quotes?.map((quote: MechanicQuote & { appointment: any }) => ({
        ...quote.appointment,
        quote: {
          id: quote.id,
          price: quote.price,
          eta: quote.eta,
          notes: quote.notes,
          created_at: quote.created_at,
          updated_at: quote.updated_at,
        },
      })) || []

    return { success: true, appointments }
  } catch (err) {
    console.error("Exception in getQuotedAppointmentsForMechanic:", err)
    return { success: false, error: "An unexpected error occurred" }
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

    // Update the appointment with the selected quote
    const { error: appointmentError } = await supabase
      .from("appointments")
      .update({
        selected_quote_id: quoteId,
        mechanic_id: quote.mechanic_id,
        status: "confirmed",
        price: quote.price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)

    if (appointmentError) throw appointmentError

    // Update the selected quote status
    const { error: quoteUpdateError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)

    if (quoteUpdateError) throw quoteUpdateError

    // Reject all other quotes for this appointment
    const { error: rejectError } = await supabase
      .from("mechanic_quotes")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
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
    const { data: quote, error: quoteError } = await supabase
      .from("mechanic_quotes")
      .select("mechanic_id, price")
      .eq("id", quoteId)
      .eq("appointment_id", appointmentId)
      .single()

    if (quoteError) {
      return { success: false, error: "Quote not found" }
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
      return { success: false, error: "Failed to update quote status" }
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
      return { success: false, error: "Failed to update appointment status" }
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

    return { success: true }
  } catch (error) {
    console.error("Error in acceptQuote:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
