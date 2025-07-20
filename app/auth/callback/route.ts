import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const userType = requestUrl.searchParams.get('userType')
  const from = requestUrl.searchParams.get('from')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)
      
      if (user) {
        console.log('✅ OAuth successful for user:', user.id, 'Email:', user.email, 'UserType:', userType)

        // Route to correct table based on userType
        if (userType === 'mechanic') {
          // Check if mechanic exists
          const { data: existingMechanic } = await supabase
            .from('mechanic_profiles')
            .select()
            .eq('email', user.email)
            .single()

          if (!existingMechanic) {
            // Create in mechanic_profiles table
            const { error: insertError } = await supabase.from('mechanic_profiles').insert({
              user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              phone: '', // Collect later
              service_area: '', // Collect later
              hourly_rate: 0, // Collect later
              specializations: [], // Collect later
              availability: {}, // Collect later
              onboarding_completed: false,
              onboarding_step: 'personal_info',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

            if (insertError) {
              console.error('Error creating mechanic profile:', insertError)
              return NextResponse.redirect(`${requestUrl.origin}/login?error=mechanic_creation_failed`)
            }

            console.log('✅ Mechanic profile created successfully')
          } else {
            console.log('Mechanic already exists')
          }
          
          return NextResponse.redirect(`${requestUrl.origin}/onboarding/mechanic/personal-info`)
          
        } else {
          // Customer flow - create in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select()
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            // Create in users table
            const { error: insertError } = await supabase.from('users').insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

            if (insertError) {
              console.error('Error creating user:', insertError)
              return NextResponse.redirect(`${requestUrl.origin}/login?error=user_creation_failed`)
            }

            console.log('✅ Customer user created successfully')
          } else {
            console.log('Customer user already exists')
          }

          // Handle onboarding flow
          if (from === 'onboarding') {
            // Continue onboarding at step 15
            return NextResponse.redirect(`${requestUrl.origin}/onboarding/customer/flow?step=15&userId=${user.id}`)
          }

          // Handle post-appointment flow
          if (from === 'appointment') {
            const appointmentId = requestUrl.searchParams.get('appointment')
            if (appointmentId) {
              // Link appointment to user
              await supabase
                .from('appointments')
                .update({ user_id: user.id })
                .eq('id', appointmentId)
            }
            return NextResponse.redirect(`${requestUrl.origin}/appointment-confirmation?linked=true`)
          }
          
          return NextResponse.redirect(`${requestUrl.origin}/`)
        }
      } else {
        console.error('No user data in auth callback')
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_user`)
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unexpected_error`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
}
