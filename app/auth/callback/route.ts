import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const role = requestUrl.searchParams.get('role')
  const from = requestUrl.searchParams.get('from')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
      }

      if (!data.user) {
        console.error('No user data in auth callback')
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_user`)
      }

      const user = data.user
      console.log('✅ OAuth successful for user:', user.id, 'Email:', user.email)

      // Check if user already exists in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (existingUser) {
        console.log('User already exists with role:', existingUser.role)
        
        // Handle post-appointment signup
        if (from === 'appointment') {
          const pendingAppointment = requestUrl.searchParams.get('appointment')
          if (pendingAppointment) {
            // Link appointment to user
            await supabase
              .from('appointments')
              .update({ user_id: user.id })
              .eq('id', pendingAppointment)
          }
          return NextResponse.redirect(`${requestUrl.origin}/appointment-confirmation?linked=true`)
        }

        // Redirect based on existing role
        if (existingUser.role === 'mechanic') {
          return NextResponse.redirect(`${requestUrl.origin}/mechanic/dashboard`)
        } else {
          return NextResponse.redirect(`${requestUrl.origin}/`)
        }
      }

      // Create new user in database
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: role || 'customer', // Default to customer if no role specified
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error creating user:', insertError)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=user_creation_failed`)
      }

      console.log('✅ User created successfully with role:', role || 'customer')

      // Handle post-appointment signup
      if (from === 'appointment') {
        const pendingAppointment = requestUrl.searchParams.get('appointment')
        if (pendingAppointment) {
          // Link appointment to user
          await supabase
            .from('appointments')
            .update({ user_id: user.id })
            .eq('id', pendingAppointment)
        }
        return NextResponse.redirect(`${requestUrl.origin}/appointment-confirmation?linked=true`)
      }

      // Redirect based on role
      if (role === 'mechanic') {
        return NextResponse.redirect(`${requestUrl.origin}/onboarding/mechanic/personal-info`)
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/`)
      }

    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unexpected_error`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
} 