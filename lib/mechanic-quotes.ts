import { createClient } from "@/lib/supabase/client"
import { validateMechanicId } from "@/lib/utils"

interface Appointment {
  id: string
  status: string
  appointment_date: string
  location: string
  issue_description?: string
  selected_car_issues?: string[]
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
  selected_car_issues?: string[]
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
 * Creates or updates a quote for an appointment
 * VERSION: 2.0.0 - Enhanced with extensive debugging and verification
 */
export async function createOrUpdateQuote(
  mechanicId: string,
  appointmentId: string,
  price: number,
  eta: string,
  notes?: string
): Promise<QuoteResponse> {
  try {
    console.log('🎯 === CREATE/UPDATE QUOTE EXTENSIVE DEBUG START (v2.0.0) ===');
    console.log('🎯 CODE VERSION CHECK: This is the NEW enhanced quote creation code with extensive debugging');
    console.log('Received quote data:', {
      mechanicId,
      appointmentId,
      price,
      eta,
      notes,
      timestamp: new Date().toISOString(),
      version: "2.0.0"
    });

    // Validate mechanic ID format and existence
    const mechanicValidation = validateMechanicId(mechanicId);
    if (!mechanicValidation.isValid) {
      console.error('❌ Invalid mechanic ID:', mechanicValidation.error);
      return { success: false, error: mechanicValidation.error };
    }

    console.log('✅ Step 1: Mechanic ID validation passed');

    // Verify mechanic profile exists
    const { data: mechanicProfile, error: mechanicError } = await createClient()
      .from('mechanic_profiles')
      .select('id')
      .eq('id', mechanicId)
      .single();

    console.log('🔍 Step 2: Mechanic profile verification:', {
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

    console.log('✅ Step 2: Mechanic profile exists');

    // Verify appointment exists and is valid
    const { data: appointment, error: appointmentError } = await createClient()
      .from('appointments')
      .select('id, status')
      .eq('id', appointmentId)
      .single();

    console.log('🔍 Step 3: Appointment verification:', {
      appointmentId,
      appointment,
      error: appointmentError
    });

    if (appointmentError) {
      console.error('❌ Appointment verification failed:', appointmentError);
      return { 
        success: false, 
        error: `Appointment not found: ${appointmentError.message}` 
      };
    }

    // Check if appointment is in a valid state for quoting
    const validQuoteStatuses = ['pending', 'quoted'];
    if (validQuoteStatuses.indexOf(appointment.status) === -1) {
      console.error('❌ Invalid appointment status for quoting:', appointment.status);
      return { 
        success: false, 
        error: `Cannot quote appointment with status: ${appointment.status}` 
      };
    }

    console.log('✅ Step 3: Appointment exists and is valid for quoting');

    // Check if quote already exists for this mechanic-appointment pair
    console.log('🔍 Step 4: Checking for existing quotes...');
    const { data: existingQuotes, error: existingQuotesError } = await createClient()
      .from('mechanic_quotes')
      .select('id, price, eta, notes, created_at')
      .eq('mechanic_id', mechanicId)
      .eq('appointment_id', appointmentId);

    console.log('🔍 Existing quotes check result:', {
      existingQuotes,
      error: existingQuotesError,
      count: existingQuotes?.length || 0
    });

    if (existingQuotesError) {
      console.error('❌ Error checking existing quotes:', existingQuotesError);
      return { 
        success: false, 
        error: `Error checking existing quotes: ${existingQuotesError.message}` 
      };
    }

    const now = new Date().toISOString();
    let result;

    if (existingQuotes && existingQuotes.length > 0) {
      // Update existing quote
      console.log('🔄 Step 5a: Updating existing quote...');
      const existingQuote = existingQuotes[0];
      
      console.log('🔄 Updating quote with data:', {
        existingQuoteId: existingQuote.id,
        newPrice: price,
        newEta: eta,
        newNotes: notes
      });

      const { data: updatedQuote, error: updateError } = await createClient()
        .from('mechanic_quotes')
        .update({
          price,
          eta,
          notes,
          updated_at: now
        })
        .eq('id', existingQuote.id)
        .select()
        .single();

      console.log('🔄 Update result:', {
        updatedQuote,
        error: updateError
      });

      if (updateError) {
        console.error('❌ Error updating quote:', updateError);
        return { 
          success: false, 
          error: `Failed to update quote: ${updateError.message}` 
        };
      }

      result = updatedQuote;
      console.log('✅ Successfully updated existing quote');
    } else {
      // Create new quote
      console.log('➕ Step 5b: Creating new quote...');
      
      console.log('➕ Creating quote with data:', {
        mechanicId,
        appointmentId,
        price,
        eta,
        notes
      });

      const { data: newQuote, error: createError } = await createClient()
        .from('mechanic_quotes')
        .insert({
          mechanic_id: mechanicId,
          appointment_id: appointmentId,
          price,
          eta,
          notes,
          status: 'pending',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      console.log('➕ Create result:', {
        newQuote,
        error: createError
      });

      if (createError) {
        console.error('❌ Error creating quote:', createError);
        return { 
          success: false, 
          error: `Failed to create quote: ${createError.message}` 
        };
      }

      result = newQuote;
      console.log('✅ Successfully created new quote');
    }

    // Update appointment status to 'quoted' if it's currently 'pending'
    if (appointment.status === 'pending') {
      console.log('🔄 Step 6: Updating appointment status to quoted...');
      
      const { error: statusUpdateError } = await createClient()
        .from('appointments')
        .update({ 
          status: 'quoted',
          updated_at: now 
        })
        .eq('id', appointmentId);

      if (statusUpdateError) {
        console.error('⚠️ Warning: Failed to update appointment status:', statusUpdateError);
        // Don't fail the entire operation for this
      } else {
        console.log('✅ Step 6: Appointment status updated to quoted');
      }
    }

    console.log('🎯 === CREATE/UPDATE QUOTE SUCCESS ===');
    console.log('Final result:', result);
    console.log('🎯 === CREATE/UPDATE QUOTE EXTENSIVE DEBUG END ===');

    return { success: true, data: result };

  } catch (error: unknown) {
    console.error('❌ Unexpected error in createOrUpdateQuote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Gets available appointments for a mechanic (not quoted or skipped by this mechanic)
 * VERSION: 2.0.0 - Enhanced querying with extensive debugging
 */
export async function getAvailableAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 === AVAILABLE APPOINTMENTS DEBUG START (v2.0.0) ===");
    console.log("🔍 CODE VERSION CHECK: This is the NEW enhanced querying code with extensive debugging");
    console.log("🔍 getAvailableAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString(),
      version: "2.0.0"
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

    // First, get the appointment IDs that this mechanic has already skipped
    console.log("🔍 Step 1: Fetching skipped appointments...");
    const { data: skippedAppointments, error: skippedError } = await createClient()
      .from('mechanic_skipped_appointments')
      .select('appointment_id')
      .eq('mechanic_id', mechanicId);

    if (skippedError) {
      console.error("❌ Error fetching skipped appointments:", skippedError);
      return { success: false, error: skippedError.message };
    }

    const skippedAppointmentIds = skippedAppointments?.map((skip: { appointment_id: string }) => skip.appointment_id) || [];
    console.log("🔍 Found skipped appointment IDs:", {
      count: skippedAppointmentIds.length,
      ids: skippedAppointmentIds
    });

    // Second, get the appointment IDs that this mechanic has already quoted
    console.log("🔍 Step 2: Fetching quoted appointments...");
    const { data: quotedAppointments, error: quotedError } = await createClient()
      .from('mechanic_quotes')
      .select('appointment_id')
      .eq('mechanic_id', mechanicId);

    if (quotedError) {
      console.error("❌ Error fetching quoted appointments:", quotedError);
      return { success: false, error: quotedError.message };
    }

    const quotedAppointmentIds = quotedAppointments?.map((quote: { appointment_id: string }) => quote.appointment_id) || [];
    console.log("🔍 Found quoted appointment IDs:", {
      count: quotedAppointmentIds.length,
      ids: quotedAppointmentIds,
      rawData: quotedAppointments
    });

    // Combine both exclusion lists
    const excludedAppointmentIds = [...skippedAppointmentIds, ...quotedAppointmentIds];
    console.log("🔍 Step 3: Combined exclusion list:", {
      totalExcluded: excludedAppointmentIds.length,
      skippedCount: skippedAppointmentIds.length,
      quotedCount: quotedAppointmentIds.length,
      allExcludedIds: excludedAppointmentIds
    });

    // Get pending appointments, excluding both skipped and quoted appointments
    console.log("🔍 Step 4: Building query for available appointments...");
    let query = createClient()
      .from('appointments')
      .select(`
        *,
        vehicles!fk_appointment_id(*),
        mechanic_quotes!appointment_id(*)
      `)
      .eq('status', 'pending');

    console.log("🔍 Base query constructed for status = 'pending'");

    // Exclude appointments that this mechanic has skipped or quoted
    if (excludedAppointmentIds.length > 0) {
      query = query.not('id', 'in', `(${excludedAppointmentIds.join(',')})`);
      console.log("🔍 Applied exclusion filter for IDs:", excludedAppointmentIds);
    } else {
      console.log("🔍 No exclusions applied - no skipped or quoted appointments");
    }

    console.log("🔍 Step 5: Executing query...");
    const { data: appointments, error } = await query;

    if (error) {
      console.error("❌ Error fetching appointments:", error);
      return { success: false, error: error.message };
    }

    console.log("🔍 === QUERY RESULTS ===");
    console.log("✅ Found available appointments:", { 
      count: appointments?.length || 0,
      appointmentIds: appointments?.map((apt: any) => apt.id) || [],
      fullData: appointments
    });

    console.log("🔍 === AVAILABLE APPOINTMENTS DEBUG END ===");
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
 * VERSION: 2.0.0 - Enhanced querying with extensive debugging
 */
export async function getQuotedAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 === QUOTED APPOINTMENTS DEBUG START (v2.0.0) ===");
    console.log("🔍 CODE VERSION CHECK: This is the NEW enhanced querying code with extensive debugging");
    console.log("🔍 getQuotedAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString(),
      version: "2.0.0"
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

    // First, get the appointment IDs that this mechanic has quoted
    console.log("🔍 Step 1: Fetching appointment IDs that mechanic has quoted...");
    const { data: quotedAppointments, error: quotedError } = await createClient()
      .from('mechanic_quotes')
      .select('appointment_id')
      .eq('mechanic_id', mechanicId);

    if (quotedError) {
      console.error("❌ Error fetching quoted appointment IDs:", quotedError);
      return { success: false, error: quotedError.message };
    }

    const quotedAppointmentIds = quotedAppointments?.map((quote: { appointment_id: string }) => quote.appointment_id) || [];
    console.log("🔍 Step 2: Found quoted appointment IDs:", {
      count: quotedAppointmentIds.length,
      ids: quotedAppointmentIds,
      rawQuotes: quotedAppointments
    });

    // If no quoted appointments, return empty array
    if (quotedAppointmentIds.length === 0) {
      console.log("✅ No quoted appointments found - returning empty array");
      return { success: true, appointments: [] };
    }

    // Get the appointments where this mechanic has submitted quotes
    console.log("🔍 Step 3: Fetching full appointment details for quoted appointments...");
    const { data: appointments, error } = await createClient()
      .from('appointments')
      .select(`
        *,
        vehicles!fk_appointment_id(*),
        mechanic_quotes!appointment_id(*)
      `)
      .in('id', quotedAppointmentIds)
      .in('status', ['pending', 'quoted', 'confirmed', 'in_progress']);

    console.log("🔍 Step 4: Query executed with filters:", {
      appointmentIds: quotedAppointmentIds,
      statusFilters: ['pending', 'quoted', 'confirmed', 'in_progress']
    });

    if (error) {
      console.error("❌ Error fetching quoted appointments:", error);
      return { success: false, error: error.message };
    }

    console.log("🔍 Step 5: Raw appointment data retrieved:", {
      count: appointments?.length || 0,
      appointmentIds: appointments?.map((apt: any) => apt.id) || [],
      appointmentStatuses: appointments?.map((apt: any) => ({ id: apt.id, status: apt.status })) || []
    });

    // Transform the data to match expected format with proper typing
    const transformedAppointments = appointments?.map((appointment: RawAppointment): AppointmentWithRelations => {
      const myQuote = appointment.mechanic_quotes.find(q => q.mechanic_id === mechanicId);
      console.log("🔍 Processing appointment:", {
        appointmentId: appointment.id,
        status: appointment.status,
        hasMyQuote: !!myQuote,
        myQuoteData: myQuote
      });
      
      return {
        ...appointment,
        quote: myQuote ? {
          id: myQuote.id,
          price: myQuote.price,
          created_at: myQuote.created_at
        } : undefined
      };
    }) || [];

    console.log("🔍 === TRANSFORMATION RESULTS ===");
    console.log("✅ Transformed quoted appointments:", {
      count: transformedAppointments.length,
      appointmentDetails: transformedAppointments.map((apt: AppointmentWithRelations) => ({
        id: apt.id,
        status: apt.status,
        hasQuote: !!apt.quote,
        quotePrice: apt.quote?.price
      }))
    });

    console.log("🔍 === QUOTED APPOINTMENTS DEBUG END ===");
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
    const { error: transactionError } = await createClient().rpc("begin_transaction")
    if (transactionError) throw transactionError

    // Get the quote details
    const { data: quote, error: quoteError } = await createClient()
      .from("mechanic_quotes")
      .select("*")
      .eq("id", quoteId)
      .single()

    if (quoteError) throw quoteError

    const now = new Date().toISOString()

    // Update the appointment with the selected quote
    const { error: appointmentError } = await createClient()
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
    const { error: quoteUpdateError } = await createClient()
      .from("mechanic_quotes")
      .update({
        status: "accepted",
        updated_at: now,
      })
      .eq("id", quoteId)

    if (quoteUpdateError) throw quoteUpdateError

    // Reject all other quotes for this appointment
    const { error: rejectError } = await createClient()
      .from("mechanic_quotes")
      .update({
        status: "rejected",
        updated_at: now,
      })
      .eq("appointment_id", appointmentId)
      .neq("id", quoteId)

    if (rejectError) throw rejectError

    // Commit the transaction
    const { error: commitError } = await createClient().rpc("commit_transaction")
    if (commitError) throw commitError

    return { success: true }
  } catch (err) {
    // Rollback on error
    await createClient().rpc("rollback_transaction")
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
    const { error: transactionError } = await createClient().rpc("begin_transaction")
    if (transactionError) throw transactionError

    // Get the quote details
    const { data: quote, error: quoteError } = await createClient()
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
    const { error: updateQuoteError } = await createClient()
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
    const { error: updateAppointmentError } = await createClient()
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
      await createClient()
        .from("mechanic_quotes")
        .update({
          status: "pending",
          updated_at: now,
        })
        .eq("id", quoteId)
      throw new Error("Failed to update appointment status")
    }

    // Reject all other quotes for this appointment
    const { error: rejectQuotesError } = await createClient()
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
    const { error: commitError } = await createClient().rpc("commit_transaction")
    if (commitError) throw commitError

    return { success: true }
  } catch (err) {
    // Rollback on error
    await createClient().rpc("rollback_transaction")
    console.error("Exception in acceptQuote:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}
