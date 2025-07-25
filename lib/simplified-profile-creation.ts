import { createClient } from '@/lib/supabase'

export interface SimplifiedProfileData {
  user_id: string
  email: string
  phone?: string
  full_name?: string
  onboarding_type: 'post_appointment' | 'mechanic' | 'customer'
}

export interface ProfileCreationResult {
  success: boolean
  existingUser?: boolean
  userId?: string
  error?: string
  errorCode?: string
}

export interface MergeTemporaryUserResult {
  success: boolean
  mergedAppointments?: number
  userId?: string
  error?: string
}

/**
 * Simplified profile creation that leverages database triggers
 * and handles existing account checks
 */
export async function createSimplifiedProfile(
  profileData: SimplifiedProfileData
): Promise<ProfileCreationResult> {
  const supabase = createClient()
  
  try {
    console.log('🚀 Starting simplified profile creation...')
    console.log('📧 Email:', profileData.email)
    console.log('📱 Phone:', profileData.phone)
    
    // Step 1: Check for existing accounts by email or phone
    const existingAccount = await checkExistingAccount(profileData.email, profileData.phone)
    
    if (existingAccount) {
      console.log('✅ Found existing account:', existingAccount.id)
      return {
        success: true,
        existingUser: true,
        userId: existingAccount.id
      }
    }
    
    // Step 1.5: Check if we're upgrading a temporary user (should have already been handled in auth callback)
    const { data: tempUser } = await supabase!
      .from('users')
      .select('id, account_type')
      .eq('id', profileData.user_id)
      .single()
    
    if (tempUser && tempUser.account_type === 'temporary') {
      console.log('🔄 Upgrading temporary user to full account')
      // Update the temporary user to full account
      const { error: updateError } = await supabase!
        .from('users')
        .update({
          email: profileData.email,
          phone: profileData.phone,
          account_type: 'full',
          profile_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', profileData.user_id)
      
      if (updateError) {
        console.error('❌ Error upgrading temporary user:', updateError)
        return {
          success: false,
          error: 'Failed to upgrade temporary user',
          errorCode: updateError.code
        }
      }
      
      console.log('✅ Temporary user upgraded successfully')
      return {
        success: true,
        existingUser: false,
        userId: profileData.user_id
      }
    }
    
    // Step 2: Create user record (trigger automatically creates profile)
    console.log('📝 Creating new user account...')
    
    const userData = {
      id: profileData.user_id,
      email: profileData.email,
      phone: profileData.phone,
      profile_status: 'pending',
      account_type: profileData.onboarding_type === 'mechanic' ? 'mechanic' : 'full',
      role: profileData.onboarding_type === 'mechanic' ? 'mechanic' : 'customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: newUser, error: userError } = await supabase!
      .from('users')
      .insert(userData)
      .select('id, email, profile_status')
      .single()
    
    if (userError) {
      console.error('❌ Error creating user:', userError)
      return {
        success: false,
        error: 'Failed to create user account',
        errorCode: userError.code
      }
    }
    
    console.log('✅ User and profile created successfully:', newUser.id)
    
    return {
      success: true,
      existingUser: false,
      userId: newUser.id
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return {
      success: false,
      error: 'Unexpected error during profile creation'
    }
  }
}

/**
 * Merge all temporary user data to the new authenticated account
 * This ensures no appointment or profile data is lost during account creation
 */
export async function mergeTemporaryUserData(
  newUserId: string,
  phone: string,
  appointmentId?: string
): Promise<MergeTemporaryUserResult> {
  const supabase = createClient()
  
  try {
    console.log('🔄 Starting temporary user data merge...')
    console.log('👤 New User ID:', newUserId)
    console.log('📱 Phone:', phone)
    console.log('🔗 Appointment ID:', appointmentId)
    
    // Step 1: Find temporary user with this phone number
    const { data: tempUser, error: tempUserError } = await supabase!
      .from('users')
      .select('id, email, account_type, created_at')
      .eq('phone', phone)
      .eq('account_type', 'temporary')
      .single()
    
    if (tempUserError) {
      if (tempUserError.code === 'PGRST116') {
        console.log('ℹ️ No temporary user found with this phone - continuing normally')
        return {
          success: true,
          mergedAppointments: 0,
          userId: newUserId
        }
      }
      throw tempUserError
    }
    
    if (!tempUser) {
      console.log('ℹ️ No temporary user found - continuing normally')
      return {
        success: true,
        mergedAppointments: 0,
        userId: newUserId
      }
    }
    
    console.log('✅ Found temporary user:', tempUser.id)
    
    // Step 2: Move ALL appointments from temporary user to new user
    const { data: movedAppointments, error: moveError } = await supabase!
      .from('appointments')
      .update({ 
        user_id: newUserId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', tempUser.id)
      .select('id')
    
    if (moveError) {
      console.error('❌ Error moving appointments:', moveError)
      throw moveError
    }
    
    const appointmentCount = movedAppointments?.length || 0
    console.log(`✅ Moved ${appointmentCount} appointments from temporary user`)
    
    // Step 3: Update new user with phone number and proper account type
    const accountType = appointmentCount > 1 ? 'phone_returning' : 'phone_only'
    
    const { error: updateError } = await supabase!
      .from('users')
      .update({
        phone: phone,
        account_type: accountType,
        updated_at: new Date().toISOString()
      })
      .eq('id', newUserId)
    
    if (updateError) {
      console.error('❌ Error updating new user:', updateError)
      throw updateError
    }
    
    console.log(`✅ Updated new user account type to: ${accountType}`)
    
    // Step 4: Delete the temporary user (since all data is now moved)
          const { error: deleteAuthError } = await (supabase.auth as any).admin.deleteUser(tempUser.id)
    if (deleteAuthError) {
      console.warn('⚠️ Could not delete temporary auth user:', deleteAuthError)
      // Continue anyway - the public.users record will be cleaned up
    }
    
    const { error: deleteUserError } = await supabase!
      .from('users')
      .delete()
      .eq('id', tempUser.id)
    
    if (deleteUserError) {
      console.warn('⚠️ Could not delete temporary public user:', deleteUserError)
    } else {
      console.log('✅ Temporary user deleted successfully')
    }
    
    console.log('🎉 Temporary user data merge completed successfully!')
    
    return {
      success: true,
      mergedAppointments: appointmentCount,
      userId: newUserId
    }
    
  } catch (error) {
    console.error('❌ Error merging temporary user data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during merge'
    }
  }
}

/**
 * Check for existing accounts by email or phone
 */
async function checkExistingAccount(email: string, phone?: string): Promise<any> {
  const supabase = createClient()
  
  try {
    // Use a safe SQL function to check for existing accounts
    const { data, error } = await supabase!
      .rpc('check_existing_account', {
        user_email: email,
        user_phone: phone || ''
      })
    
    if (error) {
      console.warn('⚠️ Error checking existing account:', error)
      return null
    }
    
    return data?.[0] || null
    
  } catch (error) {
    console.warn('⚠️ Error in account check:', error)
    return null
  }
}
