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

// Define proper types for the function parameters and return values
interface CreateQuoteParams {
  mechanic_id: string
  appointment_id: string
  price: number
  eta: string
  notes?: string
}

interface QuoteResponse {
  success: boolean
  error?: string
  data?: any
}

interface AppointmentWithRelations {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
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

interface GetAppointmentsResponse {
  success: boolean
  appointments?: AppointmentWithRelations[]
  error?: string
}

// Type for individual appointment items
interface RawAppointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  selected_services?: string[]
  car_runs?: boolean
  payment_status?: string
  selected_mechanic_id?: string
  vehicles: {
    year: string
    make: string
    model: string
    vin?: string
    mileage?: number
  } | null
  mechanic_quotes: Array<{
    id: string
    mechanic_id: string
    price: number
    eta: string
    notes?: string
    created_at: string
  }>
}

/**
 * Creates or updates a quote from a mechanic for an appointment
 */
export async function createOrUpdateQuote(
  mechanicId: string,
  appointmentId: string,
  price: number,
  eta: string,
  notes?: string
): Promise<QuoteResponse> {
  try {
    console.log('=== CREATE/UPDATE QUOTE DEBUG ===');
    console.log('Received quote data:', {
      mechanicId,
      appointmentId,
      price,
      eta,
      notes,
      timestamp: new Date().toISOString()
    });

    // Validate mechanic ID format and existence
    const mechanicValidation = validateMechanicId(mechanicId);
    if (!mechanicValidation.isValid) {
      console.error('❌ Invalid mechanic ID:', mechanicValidation.error);
      return { success: false, error: mechanicValidation.error };
    }

    // Verify mechanic profile exists
    const { data: mechanicProfile, error: mechanicError } = await supabase
      .from('mechanic_profiles')
      .select('id')
      .eq('id', mechanicId)
      .single();

    console.log('Mechanic profile verification:', {
      mechanicId,
      profile: mechanicProfile,
      error: mechanicError
    });

    if (mechanicError) {
      console.error('❌ Mechanic profile verification failed:', mechanicError);
      return { 
        success: false, 
        error: `Mechanic profile not found: ${mechanicError.message}` 
      };
    }

    // Verify appointment exists and is valid
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', appointmentId)
      .single();

    console.log('Appointment verification:', {
      appointmentId,
      appointment,
      error: appointmentError
    });

    if (appointmentError) {
      console.error('❌ Appointment verification failed:', appointmentError);
      return { success: false, error: 'Appointment not found' };
    }

    if (appointment.status !== 'pending') {
      console.error('❌ Invalid appointment status:', appointment.status);
      return { success: false, error: `Appointment is ${appointment.status}` };
    }

    // Prepare quote data
    const quoteData: CreateQuoteParams = {
      mechanic_id: mechanicId,
      appointment_id: appointmentId,
      price,
      eta: new Date(eta).toISOString(),
      notes: notes || ''
    };

    console.log('Upserting quote with data:', quoteData);

    // Upsert the quote (insert or update if exists)
    const { data: result, error: upsertError } = await supabase
      .from('mechanic_quotes')
      .upsert(quoteData, { 
        onConflict: 'mechanic_id,appointment_id',
        ignoreDuplicates: false 
      })
      .select();

    console.log('Quote upsert result:', {
      result,
      error: upsertError,
      resultCount: result?.length
    });

    if (upsertError) {
      console.error('❌ Quote upsert failed:', upsertError);
      return { success: false, error: `Failed to create quote: ${upsertError.message}` };
    }

    console.log('✅ Quote operation successful:', result);
    return { success: true, data: result };

  } catch (error: unknown) {
    console.error('❌ Unexpected error in createOrUpdateQuote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Gets all quotes for an appointment with real-time updates
 */
export async function getQuotesForAppointment(appointmentId: string): Promise<any[]> {
  try {
    const { data: quotes, error } = await supabase
      .from("mechanic_quotes")
      .select(`
        *,
        mechanic_profiles(first_name, last_name)
      `)
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error getting quotes for appointment:", error)
      return []
    }

    return quotes || []
  } catch (err: unknown) {
    console.error("Exception in getQuotesForAppointment:", err)
    return []
  }
}

/**
 * Gets all available appointments for a mechanic to quote
 */
export async function getAvailableAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 getAvailableAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString()
    });

    // Validate mechanic ID
    const validation = validateMechanicId(mechanicId);
    if (!validation.isValid) {
      console.error("❌ Mechanic ID validation failed:", validation.error);
      return { success: false, error: validation.error };
    }

    console.log("✅ mechanicId validation passed:", {
      mechanicId,
      isValid: validation.isValid
    });

    // Get pending appointments that this mechanic hasn't quoted or skipped
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vehicles!fk_appointment_id(*),
        mechanic_quotes!appointment_id(*),
        mechanic_skipped_appointments!appointment_id(*)
      `)
      .eq('status', 'pending')
      .not('mechanic_quotes.mechanic_id', 'eq', mechanicId)
      .not('mechanic_skipped_appointments.mechanic_id', 'eq', mechanicId);

    if (error) {
      console.error("❌ Error fetching appointments:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Found available appointments:", { count: appointments?.length || 0 });
    return { success: true, appointments: appointments || [] };

  } catch (error: unknown) {
    console.error("❌ Error getting available appointments:", {
      error,
      mechanicId,
      timestamp: new Date().toISOString()
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Gets all appointments a mechanic has quoted
 */
export async function getQuotedAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 getQuotedAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString()
    });

    // Validate mechanic ID
    const validation = validateMechanicId(mechanicId);
    if (!validation.isValid) {
      console.error("❌ Mechanic ID validation failed:", validation.error);
      return { success: false, error: validation.error };
    }

    console.log("✅ mechanicId validation passed:", {
      mechanicId,
      isValid: validation.isValid
    });

    // Get appointments where this mechanic has submitted quotes
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vehicles!fk_appointment_id(*),
        mechanic_quotes!appointment_id(*)
      `)
      .eq('mechanic_quotes.mechanic_id', mechanicId)
      .in('status', ['pending', 'quoted']);

    if (error) {
      console.error("❌ Error fetching quoted appointments:", error);
      return { success: false, error: error.message };
    }

    // Transform the data to match expected format with proper typing
    const transformedAppointments = appointments?.map((appointment: RawAppointment): AppointmentWithRelations => ({
      ...appointment,
      quote: appointment.mechanic_quotes.find(q => q.mechanic_id === mechanicId) ? {
        id: appointment.mechanic_quotes.find(q => q.mechanic_id === mechanicId)!.id,
        price: appointment.mechanic_quotes.find(q => q.mechanic_id === mechanicId)!.price,
        created_at: appointment.mechanic_quotes.find(q => q.mechanic_id === mechanicId)!.created_at
      } : undefined
    })) || [];

    console.log("✅ Found quoted appointments:", {
      count: transformedAppointments.length,
      mechanicId
    });

    return { success: true, appointments: transformedAppointments };

  } catch (error: unknown) {
    console.error("❌ Error getting quoted appointments:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
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
