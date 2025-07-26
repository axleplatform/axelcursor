// Use Node.js runtime for Supabase v2+ compatibility
export const runtime = 'nodejs'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { onboardingData } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }
    
    // Get current user
    const { data: { user }, error: authError } = await (supabase.auth as any).getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return NextResponse.json({ 
        error: 'Not authenticated. Please create an account to save your onboarding data.',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    console.log('✅ User authenticated for onboarding completion:', user.id)

    // Check if user profile exists first
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Profile check error:', profileCheckError)
      if (profileCheckError.code === '406' || profileCheckError.code === '401') {
        console.warn('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.')
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you are logged in and have proper permissions.',
          code: profileCheckError.code 
        }, { status: profileCheckError.code })
      }
      return NextResponse.json({ error: 'Failed to check user profile' }, { status: 500 })
    }

    // Prepare profile data
    const profileData = {
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      phone: onboardingData.phoneNumber,
      address: onboardingData.location,
      city: onboardingData.location?.split(',')[0]?.trim(),
      state: onboardingData.location?.split(',')[1]?.trim(),
      zip_code: onboardingData.location?.split(',')[2]?.trim(),
      vehicles: [onboardingData.vehicle, ...onboardingData.additionalVehicles],
      referral_source: onboardingData.referralSource,
      last_service: onboardingData.lastService,
      notifications_enabled: onboardingData.notifications,
      communication_preferences: { notifications: onboardingData.notifications },
      notification_settings: { enabled: onboardingData.notifications },
      onboarding_completed: true,
      onboarding_type: 'full',
      profile_completed_at: new Date().toISOString(),
      onboarding_data: onboardingData,
      subscription_plan: onboardingData.plan,
      subscription_status: onboardingData.freeTrial ? 'trial' : 'inactive',
      free_trial_ends_at: onboardingData.freeTrial ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      // Add auth method tracking
      auth_method: user.email ? 'email' : 'phone',
      updated_at: new Date().toISOString()
    }

    let updateResult;
    if (existingProfile) {
      // Update existing profile
      console.log('📝 Updating existing user profile...')
      updateResult = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
    } else {
      // Create new profile
      console.log('📝 Creating new user profile...')
      updateResult = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          ...profileData
        })
        .select()
    }

    if (updateResult.error) {
      console.error('❌ Error updating user profile:', updateResult.error)
      if (updateResult.error.code === '406' || updateResult.error.code === '401') {
        console.warn('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.')
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you are logged in and have proper permissions.',
          code: updateResult.error.code 
        }, { status: updateResult.error.code })
      }
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
    }

    console.log('✅ User profile updated successfully:', updateResult.data?.[0]?.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error in onboarding completion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
