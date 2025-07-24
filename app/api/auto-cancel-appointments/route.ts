// Use Node.js runtime for Supabase v2+ compatibility
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Interface for the appointment data returned from the query
interface AppointmentData {
  id: string
  appointment_date: string
  status: string
  location: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🕒 API route: Auto-cancelling overdue appointments...')
    
    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables for Supabase')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

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
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    console.log(`🔍 Found ${overdueAppointments?.length || 0} overdue pending appointments`)

    if (!overdueAppointments || overdueAppointments.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No overdue appointments found',
        eliminatedCount: 0 
      })
    }

    // Log the appointments that will be eliminated
    overdueAppointments.forEach((apt: AppointmentData) => {
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
      .in('id', overdueAppointments.map((apt: AppointmentData) => apt.id))
      .eq('status', 'pending')
      .select('id')

    if (updateError) {
      console.error('❌ Error eliminating overdue appointments:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully eliminated ${eliminatedAppointments?.length || 0} overdue appointments`)

    // Also clean up any associated mechanic quotes for these appointments
    if (eliminatedAppointments && eliminatedAppointments.length > 0) {
      const appointmentIds = eliminatedAppointments.map((apt: { id: string }) => apt.id)
      
      const { error: quotesError } = await supabase
        .from('mechanic_quotes')
        .delete()
        .in('appointment_id', appointmentIds)

      if (quotesError) {
        console.error('⚠️ Error cleaning up mechanic quotes:', quotesError)
        // Don't return error here as the main operation succeeded
      } else {
        console.log('🧹 Cleaned up associated mechanic quotes')
      }
    }

    const result = { 
      success: true, 
      message: `Successfully eliminated ${eliminatedAppointments?.length || 0} overdue appointments`,
      eliminatedCount: eliminatedAppointments?.length || 0,
      eliminatedAppointments: eliminatedAppointments?.map((apt: { id: string }) => apt.id) || []
    }

    console.log('✅ Auto-cancel function result:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error in auto-cancel API route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
