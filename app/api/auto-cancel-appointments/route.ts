import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🕒 API route: Auto-cancelling overdue appointments...')
    
    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables for Supabase')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/auto-cancel-appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Supabase Edge Function failed:', errorText)
      return NextResponse.json(
        { success: false, error: `Edge function failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
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