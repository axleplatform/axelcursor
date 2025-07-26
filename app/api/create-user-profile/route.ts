// Use Node.js runtime for Supabase v2+ compatibility
export const runtime = 'nodejs'

import { createServiceRoleClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Use service role client to bypass RLS for initial profile creation
    const supabaseAdmin = createServiceRoleClient()
    
    const { userId, email, phone, userType = 'customer', appointmentId } = await request.json()
    
    console.log('🔄 Creating user profile via API:', { userId, email, userType, appointmentId })
    console.log('🔑 Using service role client to bypass RLS')
    
    // Create user record
    const userData = {
      id: userId,
      email: email,
      phone: phone,
      account_type: 'full',
      profile_status: userType,
      role: userType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📝 Attempting to create user record:', userData)
    const { data: userDataResult, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userData)
      .select()
    
    if (userError) {
      console.error('❌ Error creating user record:', userError)
      console.error('Error code:', userError.code)
      console.error('Error message:', userError.message)
      console.error('Error details:', userError.details)
      throw new Error(`User creation failed: ${userError.message}`)
    }
    
    console.log('✅ User record created successfully:', userDataResult)
    
    // Create profile record based on user type
    if (userType === 'customer') {
      const profileData = {
        id: crypto.randomUUID(),
        user_id: userId,
        email: email,
        phone: phone,
        appointment_id: appointmentId,
        onboarding_completed: false,
        onboarding_type: 'post_appointment',
        notifications_enabled: true,
        subscription_status: 'free',
        subscription_plan: 'basic',
        vehicles: '[]',
        onboarding_data: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📝 Attempting to create customer profile:', profileData)
      const { data: profileResult, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert(profileData)
        .select()
      
      if (profileError) {
        console.error('❌ Error creating customer profile:', profileError)
        console.error('Error code:', profileError.code)
        console.error('Error message:', profileError.message)
        console.error('Error details:', profileError.details)
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }
      
      console.log('✅ Customer profile created successfully:', profileResult)
    } else if (userType === 'mechanic') {
      const mechanicProfileData = {
        user_id: userId,
        email: email,
        phone: phone,
        onboarding_completed: false,
        onboarding_step: 'personal_info',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📝 Attempting to create mechanic profile:', mechanicProfileData)
      const { data: mechanicProfileResult, error: profileError } = await supabaseAdmin
        .from('mechanic_profiles')
        .upsert(mechanicProfileData)
        .select()
      
      if (profileError) {
        console.error('❌ Error creating mechanic profile:', profileError)
        console.error('Error code:', profileError.code)
        console.error('Error message:', profileError.message)
        console.error('Error details:', profileError.details)
        throw new Error(`Mechanic profile creation failed: ${profileError.message}`)
      }
      
      console.log('✅ Mechanic profile created successfully:', mechanicProfileResult)
    }
    
    // Link appointment to user if appointmentId is provided
    if (appointmentId) {
      console.log('🔗 Linking appointment to user:', { appointmentId, userId })
      
      const { error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .update({
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
      
      if (appointmentError) {
        console.error('❌ Error linking appointment to user:', appointmentError)
        // Don't throw error here as profile creation succeeded
      } else {
        console.log('✅ Appointment linked to user successfully')
      }
    }
    
    console.log('✅ User profile created successfully via API')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error creating user profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
