import { createClient } from '@/lib/supabase/client'

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
    
    const { data: newUser, error: userError } = await supabase
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
 * Check for existing accounts by email or phone
 */
async function checkExistingAccount(email: string, phone?: string): Promise<any> {
  const supabase = createClient()
  
  try {
    // Use a safe SQL function to check for existing accounts
    const { data, error } = await supabase
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