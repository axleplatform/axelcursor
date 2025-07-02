import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🕒 Starting overdue appointment cleanup...')

    // Calculate the cutoff time (15 minutes ago)
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
    console.log('🕒 Cutoff time:', cutoffTime.toISOString())

    // Find pending appointments that are more than 15 minutes overdue
    const { data: overdueAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, appointment_date, status, location')
      .eq('status', 'pending')
      .lt('appointment_date', cutoffTime.toISOString())

    if (fetchError) {
      console.error('❌ Error fetching overdue appointments:', fetchError)
      throw fetchError
    }

    console.log(`🔍 Found ${overdueAppointments?.length || 0} overdue pending appointments`)

    if (!overdueAppointments || overdueAppointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No overdue appointments found',
          eliminatedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Log the appointments that will be eliminated
    overdueAppointments.forEach(apt => {
      console.log(`🗑️ Will eliminate appointment ${apt.id} scheduled for ${apt.appointment_date} at ${apt.location}`)
    })

    // Eliminate the overdue appointments by updating their status to 'cancelled'
    const { data: eliminatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'system',
        cancellation_reason: 'Automatically cancelled - more than 15 minutes overdue'
      })
      .in('id', overdueAppointments.map(apt => apt.id))
      .eq('status', 'pending')
      .select('id')

    if (updateError) {
      console.error('❌ Error eliminating overdue appointments:', updateError)
      throw updateError
    }

    console.log(`✅ Successfully eliminated ${eliminatedAppointments?.length || 0} overdue appointments`)

    // Also clean up any associated mechanic quotes for these appointments
    if (eliminatedAppointments && eliminatedAppointments.length > 0) {
      const appointmentIds = eliminatedAppointments.map(apt => apt.id)
      
      const { error: quotesError } = await supabase
        .from('mechanic_quotes')
        .delete()
        .in('appointment_id', appointmentIds)

      if (quotesError) {
        console.error('⚠️ Error cleaning up mechanic quotes:', quotesError)
        // Don't throw here as the main operation succeeded
      } else {
        console.log('🧹 Cleaned up associated mechanic quotes')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully eliminated ${eliminatedAppointments?.length || 0} overdue appointments`,
        eliminatedCount: eliminatedAppointments?.length || 0,
        eliminatedAppointments: eliminatedAppointments?.map(apt => apt.id) || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error in auto-cancel appointments function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
