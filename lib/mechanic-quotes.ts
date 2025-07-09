import { supabase } from "@/lib/supabase"
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
    status?: "pending" | "accepted" | "rejected"
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
    status?: "pending" | "accepted" | "rejected"
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
    
    // CRITICAL: Log appointment ID details for debugging
    console.log('🎯 APPOINTMENT ID DEBUG:', {
      appointmentId,
      type: typeof appointmentId,
      length: appointmentId?.length,
      trimmed: appointmentId?.trim(),
      hasSpaces: appointmentId?.includes(' '),
      hasNewlines: appointmentId?.includes('\n'),
      hasTabs: appointmentId?.includes('\t'),
      charCodes: appointmentId?.split('').map(c => c.charCodeAt(0))
    });

    // Validate mechanic ID format and existence
    const mechanicValidation = validateMechanicId(mechanicId);
    if (!mechanicValidation.isValid) {
      console.error('❌ Invalid mechanic ID:', mechanicValidation.error);
      return { success: false, error: mechanicValidation.error };
    }

    console.log('✅ Step 1: Mechanic ID validation passed');

    // Verify mechanic profile exists
    const { data: mechanicProfile, error: mechanicError } = await supabase
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
    const { data: appointment, error: appointmentError } = await supabase
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
      return { success: false, error: 'Appointment not found' };
    }

    if (appointment.status !== 'pending') {
      console.error('❌ Invalid appointment status:', appointment.status);
      return { success: false, error: `Appointment is ${appointment.status}` };
    }

    console.log('✅ Step 3: Appointment exists and is pending');

    // Check if quote already exists for this mechanic+appointment
    console.log('🔍 Step 4: Checking for existing quote...');
    const { data: existingQuote, error: existingError } = await supabase
      .from('mechanic_quotes')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .eq('appointment_id', appointmentId)
      .single();

    console.log('🔍 Existing quote check result:', {
      existingQuote,
      existingError,
      hasExistingQuote: !!existingQuote
    });

    // Prepare quote data
    const quoteData: CreateQuoteParams = {
      mechanic_id: mechanicId,
      appointment_id: appointmentId,
      price,
      eta: new Date(eta).toISOString(),
      notes: notes || ''
    };

    console.log('🔍 Step 5: Prepared quote data for upsert:', quoteData);

    // Upsert the quote (insert or update if exists)
    const { data: result, error: upsertError } = await supabase
      .from('mechanic_quotes')
      .upsert(quoteData, { 
        onConflict: 'mechanic_id,appointment_id',
        ignoreDuplicates: false 
      })
      .select();

    console.log('🔍 Step 6: Quote upsert result:', {
      result,
      error: upsertError,
      resultCount: result?.length,
      isInsert: !existingQuote,
      isUpdate: !!existingQuote
    });

    if (upsertError) {
      console.error('❌ Quote upsert failed:', upsertError);
      return { success: false, error: `Failed to create quote: ${upsertError.message}` };
    }

    console.log('✅ Step 6: Quote upsert successful');

    // CRITICAL: Verify the quote was actually created/updated
    console.log('🔍 Step 7: VERIFICATION - Checking if quote exists in database...');
    console.log('🔍 VERIFICATION QUERY PARAMS:', {
      mechanicId,
      appointmentId,
      appointmentIdType: typeof appointmentId,
      appointmentIdLength: appointmentId?.length
    });
    
    const { data: verificationQuote, error: verificationError } = await supabase
      .from('mechanic_quotes')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .eq('appointment_id', appointmentId)
      .single();

    console.log('🔍 VERIFICATION RESULT:', {
      verificationQuote,
      verificationError,
      quoteExists: !!verificationQuote,
      quoteId: verificationQuote?.id,
      quotePrice: verificationQuote?.price,
      quoteCreatedAt: verificationQuote?.created_at
    });

    if (!verificationQuote) {
      console.error('❌ CRITICAL: Quote was not saved to database!');
      return { success: false, error: 'Quote was not saved properly' };
    }

    console.log('✅ VERIFICATION PASSED: Quote exists in database');
    console.log('🎯 === CREATE/UPDATE QUOTE EXTENSIVE DEBUG END ===');
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
    // First, check if the appointment was edited after quotes
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('edited_after_quotes')
      .eq('id', appointmentId)
      .single();

    // If the column doesn't exist, just show quotes (fallback for migration delay)
    if (
      appointmentError &&
      appointmentError.message &&
      appointmentError.message.includes('edited_after_quotes')
    ) {
      console.warn('⚠️ edited_after_quotes column missing, showing quotes as fallback');
    } else if (appointmentError) {
      console.error('❌ Error fetching appointment for quote check:', appointmentError);
      return [];
    }

    if (appointment?.edited_after_quotes) {
      // If the appointment was edited after quotes, do not return any quotes
      console.log('🔄 Appointment was edited after quotes. Returning no quotes.');
      return [];
    }

    // Otherwise, fetch quotes as normal
    const { data: quotes, error } = await supabase
      .from("mechanic_quotes")
      .select(`
        *,
        mechanic_profiles(
          id,
          first_name,
          last_name,
          business_name,
          rating,
          review_count,
          bio,
          specialties,
          profile_image_url
        )
      `)
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('❌ Query error:', error);
      return [];
    }

    return quotes || [];
  } catch (err: unknown) {
    console.error("Exception in getQuotesForAppointment:", err);
    return [];
  }
}

/**
 * Calls the auto-cancel appointments Edge Function to eliminate overdue pending appointments
 */
export async function autoCancelOverdueAppointments(): Promise<{ success: boolean; eliminatedCount?: number; error?: string }> {
  try {
    console.log('🕒 Calling auto-cancel overdue appointments function...')
    
    const response = await fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auto-cancel-appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Auto-cancel function failed:', errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    console.log('✅ Auto-cancel function result:', result)
    
    return { 
      success: result.success, 
      eliminatedCount: result.eliminatedCount || 0,
      error: result.error 
    }
  } catch (error) {
    console.error('❌ Error calling auto-cancel function:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Gets all available appointments for a mechanic to quote
 * VERSION: 3.0.0 - Enhanced filtering with proper database-level filtering
 */
export async function getAvailableAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 === AVAILABLE APPOINTMENTS DEBUG START (v3.0.0) ===");
    console.log("🔍 CODE VERSION CHECK: This is the NEW version with proper database filtering");
    console.log("🔍 getAvailableAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString(),
      version: "3.0.0"
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

    // NEW: Auto-cancel overdue appointments before fetching
    console.log("🕒 Step 0: Auto-cancelling overdue appointments...");
    const autoCancelResult = await autoCancelOverdueAppointments();
    if (autoCancelResult.success && autoCancelResult.eliminatedCount && autoCancelResult.eliminatedCount > 0) {
      console.log(`🧹 Auto-cancelled ${autoCancelResult.eliminatedCount} overdue appointments`);
    } else if (autoCancelResult.error) {
      console.warn("⚠️ Auto-cancel failed, continuing with fetch:", autoCancelResult.error);
    }

    // First, get the appointment IDs that this mechanic has already skipped
    console.log("🔍 Step 1: Fetching skipped appointments...");
    const { data: skippedAppointments, error: skippedError } = await supabase
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
    const { data: quotedAppointments, error: quotedError } = await supabase
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

    // NEW: Enhanced available appointments query with proper filtering
    console.log("🔍 Step 3: Building enhanced query for available appointments...");
    
    // Available appointments query with proper filtering - using explicit joins
    let availableAppointmentsQuery = supabase
      .from('appointments')
      .select(`
        *,
        vehicles!fk_appointment_id(*)
      `)
      .eq('status', 'pending')  // Only pending status
      .is('selected_quote_id', null)  // No quote selected
      .eq('is_being_edited', false)  // Not being edited
      .gte('appointment_date', new Date().toISOString().split('T')[0]); // Only future appointments

    console.log("🔍 Base query constructed with proper filters");

    // Exclude appointments that this mechanic has skipped
    if (skippedAppointmentIds.length > 0) {
      availableAppointmentsQuery = availableAppointmentsQuery.not('id', 'in', `(${skippedAppointmentIds.join(',')})`);
      console.log("🔍 Applied skipped appointments exclusion filter");
    }

    // Exclude appointments that this mechanic has already quoted
    if (quotedAppointmentIds.length > 0) {
      availableAppointmentsQuery = availableAppointmentsQuery.not('id', 'in', `(${quotedAppointmentIds.join(',')})`);
      console.log("🔍 Applied quoted appointments exclusion filter");
    }

    console.log("🔍 Step 4: Executing enhanced query...");
    const { data: appointments, error } = await availableAppointmentsQuery;

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

    // Since we excluded quoted appointments at the database level, all returned appointments are available
    const finalAppointments = appointments || [];

    console.log("🔍 === FINAL FILTERED RESULTS ===");
    console.log("✅ Final available appointments after filtering:", { 
      count: finalAppointments.length,
      appointmentIds: finalAppointments.map((apt: any) => apt.id),
      editedAppointments: finalAppointments.filter((apt: any) => apt.edited_after_quotes).map((apt: any) => apt.id)
    });

    console.log("🔍 === AVAILABLE APPOINTMENTS DEBUG END ===");
    return { success: true, appointments: finalAppointments };

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
 * VERSION: 3.0.0 - Enhanced querying with proper database-level filtering
 */
export async function getQuotedAppointmentsForMechanic(mechanicId: string): Promise<GetAppointmentsResponse> {
  try {
    console.log("🔍 === QUOTED APPOINTMENTS DEBUG START (v3.0.0) ===");
    console.log("🔍 CODE VERSION CHECK: This is the NEW version with proper database filtering");
    console.log("🔍 getQuotedAppointmentsForMechanic called with:", {
      mechanicId,
      type: typeof mechanicId,
      length: mechanicId?.length,
      timestamp: new Date().toISOString(),
      version: "3.0.0"
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

    // NEW: Enhanced upcoming appointments query with proper filtering
    console.log("🔍 Step 1: Building enhanced query for upcoming appointments...");
    
    // For upcoming appointments, include BOTH confirmed AND quoted-but-pending
    const upcomingAppointmentsQuery = supabase
      .from('mechanic_quotes')
      .select(`
        *,
        appointments!inner (
          *,
          user_profiles:user_id (full_name),
          vehicles!fk_appointment_id(*)
        )
      `)
      .eq('mechanic_id', mechanicId)
      .in('appointments.status', ['pending', 'confirmed', 'in_progress'])
      .order('appointments.preferred_date', { ascending: true });

    console.log("🔍 Base query constructed with proper filters");

    console.log("🔍 Step 2: Executing upcoming appointments query...");
    const { data: upcomingData, error } = await upcomingAppointmentsQuery;

    if (error) {
      console.error("❌ Error fetching upcoming appointments:", error);
      return { success: false, error: error.message };
    }

    console.log("🔍 === UPCOMING APPOINTMENTS QUERY RESULTS ===");
    console.log("✅ Found upcoming appointments:", { 
      count: upcomingData?.length || 0,
      appointmentIds: upcomingData?.map((item: any) => item.appointments?.id) || [],
      appointmentStatuses: upcomingData?.map((item: any) => ({ 
        id: item.appointments?.id, 
        status: item.appointments?.status,
        quoteStatus: item.status
      })) || []
    });

    // Step 3: Transform the data to match expected format
    console.log("🔍 Step 3: Transforming upcoming appointments data...");
    const transformedAppointments = upcomingData?.map((item: any): AppointmentWithRelations => {
      const appointment = item.appointments;
      const quote = item;
      
      console.log("🔍 Processing upcoming appointment:", {
        appointmentId: appointment.id,
        status: appointment.status,
        quoteStatus: quote.status,
        quotePrice: quote.price
      });
      
      return {
        ...appointment,
        mechanic_quotes: [quote],
        quote: {
          id: quote.id,
          price: quote.price,
          created_at: quote.created_at
        }
      };
    }) || [];

    console.log("🔍 === TRANSFORMATION RESULTS ===");
    console.log("✅ Transformed upcoming appointments:", {
      count: transformedAppointments.length,
      appointmentDetails: transformedAppointments.map((apt: AppointmentWithRelations) => ({
        id: apt.id,
        status: apt.status,
        hasQuote: !!apt.quote,
        quotePrice: apt.quote?.price,
        quoteStatus: apt.mechanic_quotes?.[0]?.status
      }))
    });

    console.log("🔍 === UPCOMING APPOINTMENTS DEBUG END ===");
    return { success: true, appointments: transformedAppointments };

  } catch (error: unknown) {
    console.error("❌ Error getting upcoming appointments:", error);
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
