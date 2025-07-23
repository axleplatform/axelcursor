import { supabase } from '@/lib/supabase'

export interface ProfileCreationData {
  user_id: string
  email: string
  phone?: string
  full_name?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  communication_preferences?: any
  notification_settings?: any
  onboarding_completed?: boolean
  onboarding_type?: string
  vehicles?: any[]
  referral_source?: string
  last_service?: any
  notifications_enabled?: boolean
  subscription_plan?: string
  subscription_status?: string
  free_trial_ends_at?: string
  onboarding_data?: any
}

export interface ProfileCreationResult {
  success: boolean
  profile?: any
  error?: string
  errorCode?: string
  action: 'created' | 'updated' | 'fetched' | 'failed'
}

/**
 * Robust profile creation function that handles all edge cases
 */
export async function createOrUpdateUserProfile(
  profileData: ProfileCreationData
): Promise<ProfileCreationResult> {
  console.log('🔧 Starting profile creation/update process...')
  console.log('👤 User ID:', profileData.user_id)
  console.log('📧 Email:', profileData.email)
  console.log('📋 Full payload:', JSON.stringify(profileData, null, 2))

  try {
    // Step 1: Verify user exists in auth.users
    console.log('🔍 Step 1: Verifying user exists in auth.users...')
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser.user) {
      console.error('❌ Authentication error:', authError)
      return {
        success: false,
        error: 'User not authenticated',
        errorCode: 'AUTH_ERROR',
        action: 'failed'
      }
    }

    console.log('✅ Authenticated user:', authUser.user.id)
    console.log('🔍 Comparing user IDs - Auth:', authUser.user.id, 'Profile:', profileData.user_id)

    if (authUser.user.id !== profileData.user_id) {
      console.error('❌ User ID mismatch - Auth user:', authUser.user.id, 'Profile user:', profileData.user_id)
      return {
        success: false,
        error: 'User ID mismatch',
        errorCode: 'USER_MISMATCH',
        action: 'failed'
      }
    }

    console.log('✅ User authentication verified')

    // Step 2: Check if user exists in users table
    console.log('🔍 Step 2: Checking if user exists in users table...')
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, profile_status, account_type')
      .eq('id', profileData.user_id)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', userCheckError)
      return {
        success: false,
        error: 'Failed to check user existence',
        errorCode: userCheckError.code,
        action: 'failed'
      }
    }

    // Step 3: Create user record if it doesn't exist
    if (!existingUser) {
      console.log('📝 Step 3: Creating user record in users table...')
      
      // Determine role based on onboarding type
      const userRole = profileData.onboarding_type === 'mechanic' ? 'mechanic' : 'customer'
      const accountType = profileData.onboarding_type === 'mechanic' ? 'mechanic' : 'full'
      
      const userRecordData = {
        id: profileData.user_id,
        email: profileData.email,
        phone: profileData.phone,
        profile_status: 'pending',
        account_type: accountType,
        role: userRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 User record data:', JSON.stringify(userRecordData, null, 2))
      
      const { data: userRecord, error: createUserError } = await supabase
        .from('users')
        .insert(userRecordData)
        .select()
        .single()

      if (createUserError) {
        console.error('❌ Error creating user record:', createUserError)
        console.error('📋 Error details:', JSON.stringify(createUserError, null, 2))
        if (createUserError.code === '23505') { // Unique violation
          console.warn('⚠️ User already exists, continuing...')
        } else {
          return {
            success: false,
            error: 'Failed to create user record',
            errorCode: createUserError.code,
            action: 'failed'
          }
        }
      } else {
        console.log('✅ User record created')
      }
    } else {
      console.log('✅ User record exists:', existingUser.profile_status)
    }

    // Step 4: Check if profile already exists
    console.log('🔍 Step 4: Checking if user profile exists...')
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', profileData.user_id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileCheckError)
      console.error('📋 Profile check error details:', JSON.stringify(profileCheckError, null, 2))
      return {
        success: false,
        error: 'Failed to check profile existence',
        errorCode: profileCheckError.code,
        action: 'failed'
      }
    }

    // Step 5: Create or update profile
    if (!existingProfile) {
      console.log('📝 Step 5: Creating new user profile...')
      
      // Ensure user_id matches authenticated user for RLS compliance
      const profileInsertData = {
        ...profileData,
        user_id: authUser.user.id, // Ensure this matches auth.uid()
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 Profile insert data:', JSON.stringify(profileInsertData, null, 2))
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert(profileInsertData)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating profile:', createError)
        console.error('📋 Create error details:', JSON.stringify(createError, null, 2))
        
        // Handle specific error codes
        if (createError.code === '23505') { // Unique violation
          console.warn('⚠️ Profile already exists, fetching existing...')
          return await fetchExistingProfile(profileData.user_id)
        } else if (createError.code === '406') {
          console.error('❌ RLS policy violation - user not authenticated properly')
          console.error('🔍 Auth user ID:', authUser.user.id)
          console.error('🔍 Profile user_id:', profileData.user_id)
          return {
            success: false,
            error: 'Authentication required for profile creation',
            errorCode: '406',
            action: 'failed'
          }
        } else if (createError.code === '409') {
          console.warn('⚠️ Conflict error, fetching existing profile...')
          return await fetchExistingProfile(profileData.user_id)
        } else if (createError.code === '403') {
          console.error('❌ 403 Forbidden - RLS policy violation')
          console.error('🔍 Auth user ID:', authUser.user.id)
          console.error('🔍 Profile user_id:', profileData.user_id)
          console.error('🔍 Auth session:', authUser.session ? 'Valid' : 'Invalid')
          return {
            success: false,
            error: 'Access denied - RLS policy violation',
            errorCode: '403',
            action: 'failed'
          }
        } else {
          return {
            success: false,
            error: 'Failed to create profile',
            errorCode: createError.code,
            action: 'failed'
          }
        }
      }

      console.log('✅ Profile created successfully')
      return {
        success: true,
        profile: newProfile,
        action: 'created'
      }
    } else {
      console.log('📝 Step 5: Updating existing user profile...')
      
      // Ensure user_id matches authenticated user for RLS compliance
      const profileUpdateData = {
        ...profileData,
        user_id: authUser.user.id, // Ensure this matches auth.uid()
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 Profile update data:', JSON.stringify(profileUpdateData, null, 2))
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update(profileUpdateData)
        .eq('user_id', profileData.user_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating profile:', updateError)
        console.error('📋 Update error details:', JSON.stringify(updateError, null, 2))
        return {
          success: false,
          error: 'Failed to update profile',
          errorCode: updateError.code,
          action: 'failed'
        }
      }

      console.log('✅ Profile updated successfully')
      return {
        success: true,
        profile: updatedProfile,
        action: 'updated'
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error in profile creation:', error)
    console.error('📋 Error details:', JSON.stringify(error, null, 2))
    return {
      success: false,
      error: 'Unexpected error occurred',
      errorCode: 'UNKNOWN',
      action: 'failed'
    }
  }
}

/**
 * Fetch existing profile when creation fails due to conflicts
 */
async function fetchExistingProfile(userId: string): Promise<ProfileCreationResult> {
  console.log('🔍 Fetching existing profile for user:', userId)
  
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching existing profile:', error)
      return {
        success: false,
        error: 'Failed to fetch existing profile',
        errorCode: error.code,
        action: 'failed'
      }
    }

    console.log('✅ Existing profile fetched successfully')
    return {
      success: true,
      profile,
      action: 'fetched'
    }
  } catch (error) {
    console.error('❌ Unexpected error fetching profile:', error)
    return {
      success: false,
      error: 'Unexpected error fetching profile',
      errorCode: 'UNKNOWN',
      action: 'failed'
    }
  }
}

/**
 * Update user status after profile creation
 */
export async function updateUserStatus(
  userId: string, 
  status: 'customer' | 'mechanic' | 'no',
  accountType: string = 'full',
  role?: 'customer' | 'mechanic' | 'anon'
): Promise<boolean> {
  console.log('🔄 Updating user status:', { userId, status, accountType, role })
  
  try {
    // Determine role if not provided
    const userRole = role || (status === 'mechanic' ? 'mechanic' : 'customer')
    
    const { error } = await supabase
      .from('users')
      .update({ 
        profile_status: status,
        account_type: accountType,
        role: userRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ Error updating user status:', error)
      return false
    }

    console.log('✅ User status updated successfully')
    return true
  } catch (error) {
    console.error('❌ Unexpected error updating user status:', error)
    return false
  }
}

/**
 * Check if user has complete profile
 */
export async function checkProfileCompletion(userId: string): Promise<{
  hasProfile: boolean
  isComplete: boolean
  profile?: any
}> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      return { hasProfile: false, isComplete: false }
    }

    const isComplete = profile.onboarding_completed === true

    return {
      hasProfile: true,
      isComplete,
      profile
    }
  } catch (error) {
    console.error('❌ Error checking profile completion:', error)
    return { hasProfile: false, isComplete: false }
  }
}

/**
 * Handle profile creation errors with user-friendly messages
 */
export function getProfileErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'AUTH_ERROR':
      return 'Please log in to create your profile'
    case 'USER_MISMATCH':
      return 'User authentication mismatch'
    case '406':
      return 'Authentication required. Please log in again'
    case '409':
      return 'Profile already exists'
    case '23505':
      return 'Profile already exists'
    case 'PGRST116':
      return 'Profile not found'
    default:
      return 'An error occurred while creating your profile. Please try again.'
  }
}
