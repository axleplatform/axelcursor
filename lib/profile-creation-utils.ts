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
  profile_completed_at?: string
}

export interface ProfileCreationResult {
  success: boolean
  profile?: any
  error?: string
  errorCode?: string
  action: 'created' | 'updated' | 'fetched' | 'failed'
}

/**
 * Simplified and robust profile creation function
 */
export async function createOrUpdateUserProfile(
  profileData: ProfileCreationData
): Promise<ProfileCreationResult> {
  console.log('🔧 Starting simplified profile creation/update process...')
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
    
    // Use a safer approach to check user existence - avoid direct query that might cause 406
    let existingUser = null
    try {
      const { data: userCheck, error: userError } = await supabase
        .from('users')
        .select('id, profile_status, account_type, role')
        .eq('id', profileData.user_id)
        .single()

      if (userError) {
        if (userError.code === '406') {
          console.warn('⚠️ 406 error checking users table - proceeding with user creation')
          // Continue with user creation even if we can't check
        } else if (userError.code === 'PGRST116') {
          console.log('📝 User does not exist in users table, will create...')
        } else {
          console.error('❌ Error checking user:', userError)
          return {
            success: false,
            error: 'Failed to check user existence',
            errorCode: userError.code,
            action: 'failed'
          }
        }
      } else {
        existingUser = userCheck
        console.log('✅ User already exists in users table')
      }
    } catch (error) {
      console.warn('⚠️ Error checking users table, proceeding with user creation:', error)
    }

    // Step 3: Create user record if not exists
    if (!existingUser) {
      console.log('📝 Step 3: Creating user record in users table...')
      
      // Determine role and account type based on onboarding type
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
        console.error('📋 User creation error details:', JSON.stringify(createUserError, null, 2))
        
        if (createUserError.code === '23505') { // Unique violation
          console.warn('⚠️ User already exists, continuing...')
        } else if (createUserError.code === '406') {
          console.error('❌ 406 error creating user - RLS policy issue')
          return {
            success: false,
            error: 'Authentication required for user creation',
            errorCode: '406',
            action: 'failed'
          }
        } else {
          return {
            success: false,
            error: 'Failed to create user record',
            errorCode: createUserError.code,
            action: 'failed'
          }
        }
      } else {
        console.log('✅ User record created successfully')
      }
    }

    // Step 4: Check if user profile exists
    console.log('🔍 Step 4: Checking if user profile exists...')
    
    let existingProfile = null
    try {
      const { data: profileCheck, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, onboarding_completed')
        .eq('user_id', profileData.user_id)
        .single()

      if (profileError) {
        if (profileError.code === '406') {
          console.warn('⚠️ 406 error checking user_profiles table - proceeding with profile creation')
          // Continue with profile creation even if we can't check
        } else if (profileError.code === 'PGRST116') {
          console.log('📝 Profile does not exist, will create...')
        } else {
          console.error('❌ Error checking profile:', profileError)
          console.error('📋 Profile check error details:', JSON.stringify(profileError, null, 2))
          return {
            success: false,
            error: 'Failed to check profile existence',
            errorCode: profileError.code,
            action: 'failed'
          }
        }
      } else {
        existingProfile = profileCheck
        console.log('✅ Profile already exists:', existingProfile.id)
      }
    } catch (error) {
      console.warn('⚠️ Error checking user_profiles table, proceeding with profile creation:', error)
    }

    // Step 5: Insert profile if not exists
    if (!existingProfile) {
      console.log('📝 Step 5: Creating new user profile...')
      
      // Build profile insert data with only provided fields
      const profileInsertData: any = {
        id: crypto.randomUUID(), // Generate UUID for the profile
        user_id: authUser.user.id, // Ensure this matches auth.uid()
        email: profileData.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only add optional fields if they are provided
      if (profileData.phone) profileInsertData.phone = profileData.phone
      if (profileData.full_name) profileInsertData.full_name = profileData.full_name
      if (profileData.address) profileInsertData.address = profileData.address
      if (profileData.city) profileInsertData.city = profileData.city
      if (profileData.state) profileInsertData.state = profileData.state
      if (profileData.zip_code) profileInsertData.zip_code = profileData.zip_code
      if (profileData.communication_preferences) profileInsertData.communication_preferences = profileData.communication_preferences
      if (profileData.notification_settings) profileInsertData.notification_settings = profileData.notification_settings
      if (profileData.onboarding_completed !== undefined) profileInsertData.onboarding_completed = profileData.onboarding_completed
      if (profileData.onboarding_type) profileInsertData.onboarding_type = profileData.onboarding_type
      if (profileData.profile_completed_at) profileInsertData.profile_completed_at = profileData.profile_completed_at
      if (profileData.vehicles) profileInsertData.vehicles = profileData.vehicles
      if (profileData.referral_source) profileInsertData.referral_source = profileData.referral_source
      if (profileData.last_service) profileInsertData.last_service = profileData.last_service
      if (profileData.notifications_enabled !== undefined) profileInsertData.notifications_enabled = profileData.notifications_enabled
      if (profileData.subscription_plan) profileInsertData.subscription_plan = profileData.subscription_plan
      if (profileData.subscription_status) profileInsertData.subscription_status = profileData.subscription_status
      if (profileData.free_trial_ends_at) profileInsertData.free_trial_ends_at = profileData.free_trial_ends_at
      if (profileData.onboarding_data) profileInsertData.onboarding_data = profileData.onboarding_data
      
      console.log('📋 Profile insert data:', JSON.stringify(profileInsertData, null, 2))
      
      const { data: newProfile, error: insertProfileError } = await supabase
        .from('user_profiles')
        .insert(profileInsertData)
        .select()
        .single()

      if (insertProfileError) {
        console.error('❌ Error inserting profile:', insertProfileError)
        console.error('📋 Profile insert error details:', JSON.stringify(insertProfileError, null, 2))
        
        // Handle specific error codes
        if (insertProfileError.code === '23505') { // Unique violation
          console.warn('⚠️ Profile already exists, fetching existing...')
          return await fetchExistingProfile(profileData.user_id)
        } else if (insertProfileError.code === '406') {
          console.error('❌ RLS policy violation - user not authenticated properly')
          console.error('🔍 Auth user ID:', authUser.user.id)
          console.error('🔍 Profile user_id:', profileData.user_id)
          return {
            success: false,
            error: 'Authentication required for profile creation',
            errorCode: '406',
            action: 'failed'
          }
        } else if (insertProfileError.code === '409') {
          console.warn('⚠️ Conflict error, fetching existing profile...')
          return await fetchExistingProfile(profileData.user_id)
        } else if (insertProfileError.code === '403') {
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
        } else if (insertProfileError.code === '400') {
          console.error('❌ 400 Bad Request - Schema mismatch')
          console.error('🔍 This usually means a column does not exist in the table')
          console.error('📋 Error details:', JSON.stringify(insertProfileError, null, 2))
          return {
            success: false,
            error: 'Database schema mismatch. Please contact support.',
            errorCode: '400',
            action: 'failed'
          }
        } else if (insertProfileError.code === '23502') {
          console.error('❌ 23502 Not Null Violation - Missing required field')
          console.error('📋 Error details:', JSON.stringify(insertProfileError, null, 2))
          return {
            success: false,
            error: 'Missing required field in profile creation',
            errorCode: '23502',
            action: 'failed'
          }
        } else {
          return {
            success: false,
            error: 'Failed to create profile',
            errorCode: insertProfileError.code,
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
      console.log('✅ Profile already exists:', existingProfile.id)
      
      // Optionally update existing profile with new data
      if (profileData.onboarding_completed && !existingProfile.onboarding_completed) {
        console.log('📝 Step 5: Updating existing profile with completion data...')
        
        // Build profile update data with only provided fields
        const profileUpdateData: any = {
          user_id: authUser.user.id, // Ensure this matches auth.uid()
          updated_at: new Date().toISOString()
        }

        // Only add optional fields if they are provided
        if (profileData.phone) profileUpdateData.phone = profileData.phone
        if (profileData.full_name) profileUpdateData.full_name = profileData.full_name
        if (profileData.address) profileUpdateData.address = profileData.address
        if (profileData.city) profileUpdateData.city = profileData.city
        if (profileData.state) profileUpdateData.state = profileData.state
        if (profileData.zip_code) profileUpdateData.zip_code = profileData.zip_code
        if (profileData.communication_preferences) profileUpdateData.communication_preferences = profileData.communication_preferences
        if (profileData.notification_settings) profileUpdateData.notification_settings = profileData.notification_settings
        if (profileData.onboarding_completed !== undefined) profileUpdateData.onboarding_completed = profileData.onboarding_completed
        if (profileData.onboarding_type) profileUpdateData.onboarding_type = profileData.onboarding_type
        if (profileData.profile_completed_at) profileUpdateData.profile_completed_at = profileData.profile_completed_at
        if (profileData.vehicles) profileUpdateData.vehicles = profileData.vehicles
        if (profileData.referral_source) profileUpdateData.referral_source = profileData.referral_source
        if (profileData.last_service) profileUpdateData.last_service = profileData.last_service
        if (profileData.notifications_enabled !== undefined) profileUpdateData.notifications_enabled = profileData.notifications_enabled
        if (profileData.subscription_plan) profileUpdateData.subscription_plan = profileData.subscription_plan
        if (profileData.subscription_status) profileUpdateData.subscription_status = profileData.subscription_status
        if (profileData.free_trial_ends_at) profileUpdateData.free_trial_ends_at = profileData.free_trial_ends_at
        if (profileData.onboarding_data) profileUpdateData.onboarding_data = profileData.onboarding_data
        
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
      
      return {
        success: true,
        profile: existingProfile,
        action: 'fetched'
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
