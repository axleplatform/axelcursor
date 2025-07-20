import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const role = requestUrl.searchParams.get('role')
  const from = requestUrl.searchParams.get('from')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)
      
      if (user) {
        console.log('✅ OAuth successful for user:', user.id, 'Email:', user.email)

        // Check if user already exists in our database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          // Create new user with role
          const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name,
            role: role || 'customer',
            avatar_url: user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          if (insertError) {
            console.error('Error creating user:', insertError)
            return NextResponse.redirect(`${requestUrl.origin}/login?error=user_creation_failed`)
          }

          console.log('✅ User created successfully with role:', role || 'customer')
        } else {
          console.log('User already exists with role:', existingUser.role)
        }

        // Handle post-appointment signup
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

        // Redirect based on role
        if (role === 'mechanic') {
          return NextResponse.redirect(`${requestUrl.origin}/mechanic/dashboard`)
        } else if (from === 'appointment') {
          return NextResponse.redirect(`${requestUrl.origin}/appointments`)
        } else {
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