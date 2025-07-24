import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, email, phone, userType = 'customer' } = await request.json()
    
    console.log('🔄 Creating user profile via API:', { userId, email, userType })
    
    // Create user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        phone: phone,
        account_type: 'full',
        profile_status: userType,
        role: userType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (userError) {
      console.error('❌ Error creating user record:', userError)
      throw new Error(`User creation failed: ${userError.message}`)
    }
    
    // Create profile record based on user type
    if (userType === 'customer') {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: email,
          phone: phone,
          onboarding_completed: false,
          onboarding_type: 'post_appointment',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error('❌ Error creating customer profile:', profileError)
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }
    } else if (userType === 'mechanic') {
      const { error: profileError } = await supabaseAdmin
        .from('mechanic_profiles')
        .upsert({
          user_id: userId,
          email: email,
          phone: phone,
          onboarding_completed: false,
          onboarding_step: 'personal_info',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error('❌ Error creating mechanic profile:', profileError)
        throw new Error(`Mechanic profile creation failed: ${profileError.message}`)
      }
    }
    
    console.log('✅ User profile created successfully via API')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Error creating user profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 