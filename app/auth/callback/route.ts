import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createSimplifiedProfile, mergeTemporaryUserData } from '@/lib/simplified-profile-creation'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const userType = requestUrl.searchParams.get('userType')
  const from = requestUrl.searchParams.get('from')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { data: { user } } = await (supabase.auth as any).exchangeCodeForSession(code)
      
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
            
            // Update users table to set profile_status
            await supabase
              .from('users')
              .update({ 
                profile_status: 'mechanic',
                account_type: 'mechanic'
              })
              .eq('id', user.id);
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
            // Check if there's a temporary user with this phone number that we should upgrade
            const phone = requestUrl.searchParams.get('phone')
            let shouldUpgradeTemporary = false
            let temporaryUserId = null
            
            if (phone) {
              const { data: tempUser } = await supabase
                .from('users')
                .select('id')
                .eq('phone', phone)
                .eq('account_type', 'temporary')
                .single()
              
              if (tempUser) {
                shouldUpgradeTemporary = true
                temporaryUserId = tempUser.id
                console.log('🔄 Found temporary user to upgrade:', tempUser.id)
              }
            }
            
            if (shouldUpgradeTemporary && temporaryUserId) {
              // Move appointments from temporary user to new user ID
              const { error: moveError } = await supabase
                .from('appointments')
                .update({ 
                  user_id: user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', temporaryUserId)
              
              if (moveError) {
                console.error('Error moving appointments:', moveError)
                return NextResponse.redirect(`${requestUrl.origin}/login?error=appointment_move_failed`)
              }
              
              // Delete the temporary user
              const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', temporaryUserId)
              
              if (deleteError) {
                console.warn('Warning: Could not delete temporary user:', deleteError)
              }
              
              console.log('✅ Appointments moved from temporary user to new user')
            }
            
            // Create new user in users table (or this will be the upgraded user)
            const { error: insertError } = await supabase.from('users').insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              role: 'customer',
              account_type: 'full',
              profile_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

            if (insertError) {
              console.error('Error creating user:', insertError)
              return NextResponse.redirect(`${requestUrl.origin}/login?error=user_creation_failed`)
            }

                        console.log('✅ New customer user created successfully')
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

          // Handle post-appointment flow with profile completion check
          const redirect = requestUrl.searchParams.get('redirect')
          if (redirect === 'post-appointment') {
            const appointmentId = requestUrl.searchParams.get('appointmentId')
            const phone = requestUrl.searchParams.get('phone')
            const fullName = requestUrl.searchParams.get('fullName')
            
            console.log('🔄 Handling post-appointment OAuth callback...');
            console.log('👤 User ID:', user.id);
            console.log('📧 Email:', user.email);
            console.log('📱 Phone:', phone);
            console.log('🔗 Appointment ID:', appointmentId);

            // Handle post-appointment account creation
            if (appointmentId && phone && fullName) {
              console.log('📋 Post-appointment account creation detected')
              console.log('📱 Phone:', phone)
              console.log('👤 Full Name:', fullName)
              
              try {
                // Step 1: Merge all temporary user data (appointments, etc.) to new account
                console.log('🔄 Merging temporary user data...')
                const mergeResult = await mergeTemporaryUserData(user.id, phone, appointmentId)
                
                if (!mergeResult.success) {
                  console.error('❌ Failed to merge temporary user data:', mergeResult.error)
                  // Continue anyway - user can still complete onboarding
                } else {
                  console.log(`✅ Merged ${mergeResult.mergedAppointments} appointments from temporary user`)
                }
                
                // Step 2: Create user profile
                const profileResult = await createSimplifiedProfile({
                  user_id: user.id,
                  email: user.email!,
                  phone: phone,
                  full_name: fullName,
                  onboarding_type: 'post_appointment'
                })
                
                if (profileResult.success) {
                  if (profileResult.existingUser) {
                    console.log('✅ Linked to existing account')
                    // Redirect to existing user's dashboard
                    return NextResponse.redirect(new URL('/customer-dashboard', request.url))
                  } else {
                    console.log('✅ New account created successfully')
                    // Redirect to post-appointment onboarding
                    return NextResponse.redirect(new URL('/onboarding/customer/post-appointment', request.url))
                  }
                } else {
                  console.error('❌ Profile creation failed:', profileResult.error)
                  return NextResponse.redirect(new URL('/onboarding/customer/post-appointment', request.url))
                }
                
              } catch (error) {
                console.error('❌ Error in post-appointment flow:', error)
                return NextResponse.redirect(new URL('/onboarding/customer/post-appointment', request.url))
              }
            }

            // Check if user already has a completed profile
            console.log('🔍 Checking if user has completed profile...');
            const { data: existingProfile, error: profileCheckError } = await supabase
              .from('user_profiles')
              .select('onboarding_completed, onboarding_type')
              .eq('user_id', user.id)
              .single();

            if (profileCheckError && profileCheckError.code !== 'PGRST116') {
              console.error('❌ Error checking existing profile:', profileCheckError);
              // Continue with onboarding as fallback
            }

            let shouldRedirectToDashboard = false;
            if (existingProfile) {
              console.log('📋 Existing profile found:', {
                onboarding_completed: existingProfile.onboarding_completed,
                onboarding_type: existingProfile.onboarding_type
              });
              
              // Check if user has completed onboarding
              if (existingProfile.onboarding_completed) {
                console.log('✅ User has completed onboarding, redirecting to dashboard');
                shouldRedirectToDashboard = true;
              } else {
                console.log('⏳ User has incomplete onboarding, continuing to post-appointment flow');
              }
            } else {
              console.log('📝 No existing profile found, continuing to post-appointment flow');
            }

            console.log('🎉 Post-appointment OAuth flow completed successfully!');
            console.log('👤 User ID:', user.id);
            console.log('📅 Completion time:', new Date().toISOString());

            // Redirect based on profile completion status
            if (shouldRedirectToDashboard) {
              console.log('🔗 Redirecting to customer dashboard...');
              return NextResponse.redirect(`${requestUrl.origin}/customer-dashboard`);
            } else {
              console.log('🔗 Redirecting to post-appointment onboarding...');
              const redirectUrl = appointmentId && phone 
                ? `${requestUrl.origin}/onboarding/customer/post-appointment?appointmentId=${appointmentId}&phone=${phone}`
                : `${requestUrl.origin}/onboarding/customer/post-appointment`;
              return NextResponse.redirect(redirectUrl);
            }
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
