// Use Node.js runtime for Supabase v2+ compatibility
export const runtime = 'nodejs'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { onboardingData } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await (supabase.auth as any).getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Update user with onboarding data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        vehicles: [onboardingData.vehicle, ...onboardingData.additionalVehicles],
        referral_source: onboardingData.referralSource,
        last_service: onboardingData.lastService,
        location: onboardingData.location,
        notifications_enabled: onboardingData.notifications,
        phone: onboardingData.phoneNumber,
        subscription_plan: onboardingData.plan,
        subscription_status: onboardingData.freeTrial ? 'trial' : 'inactive',
        free_trial_ends_at: onboardingData.freeTrial ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        onboarding_completed: true,
        onboarding_data: onboardingData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user with onboarding data:', updateError)
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in onboarding completion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
