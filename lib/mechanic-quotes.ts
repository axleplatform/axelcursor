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
}

/**
 * Creates or updates a quote from a mechanic for an appointment
 */
export async function createOrUpdateQuote(
  mechanicId: string,
  appointmentId: string,
  price: number,
  eta = "1-2 hours",
  notes = "",
): Promise<{ success: boolean; quote?: MechanicQuote; error?: string }> {
  try {
    // Check if a quote already exists
    const { data: existingQuote, error: checkError } = await supabase
      .from("mechanic_quotes")
      .select("*")
      .eq("mechanic_id", mechanicId)
      .eq("appointment_id", appointmentId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is expected if no quote exists
      console.error("Error checking for existing quote:", checkError)
      return { success: false, error: "Failed to check for existing quote" }
    }

    let result

    if (existingQuote) {
      // Update existing quote
      const { data, error } = await supabase
        .from("mechanic_quotes")
        .update({
          price,
          eta,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingQuote.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating quote:", error)
        return { success: false, error: "Failed to update quote" }
      }

      result = { success: true, quote: data }
    } else {
      // Create new quote
      const { data, error } = await supabase
        .from("mechanic_quotes")
        .insert({
          mechanic_id: mechanicId,
          appointment_id: appointmentId,
          price,
          eta,
          notes,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating quote:", error)
        return { success: false, error: "Failed to create quote" }
      }

      result = { success: true, quote: data }
    }

    return result
  } catch (err) {
    console.error("Exception in createOrUpdateQuote:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Gets all quotes for an appointment
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
          metadata
        )
      `)
      .eq("appointment_id", appointmentId)

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
    const quotedAppointmentIds = existingQuotes?.map((q) => q.appointment_id) || []

    // Fetch available appointments (pending, not quoted by this mechanic yet)
    const { data: availableData, error: availableError } = await supabase
      .from("appointments")
      .select(`
        *,
        vehicles(*)
      `)
      .eq("status", "pending")
      .not("id", "in", quotedAppointmentIds.length > 0 ? `(${quotedAppointmentIds.join(",")})` : "(0)")
      .order("appointment_date", { ascending: true })

    if (availableError) {
      console.error("Error getting available appointments:", availableError)
      return { success: false, error: "Failed to get available appointments" }
    }

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
      quotes?.map((quote) => ({
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
 * Selects a quote for an appointment
 */
export async function selectQuoteForAppointment(
  appointmentId: string,
  quoteId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("appointments")
      .update({
        selected_quote_id: quoteId,
        status: "pending_payment",
      })
      .eq("id", appointmentId)

    if (error) {
      console.error("Error selecting quote:", error)
      return { success: false, error: "Failed to select quote" }
    }

    return { success: true }
  } catch (err) {
    console.error("Exception in selectQuoteForAppointment:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}
