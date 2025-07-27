// Use Node.js runtime for Supabase v2+ compatibility
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    console.log('🚀 Onboarding completion API called');
    console.log('📥 Request headers:', Array.from(request.headers.entries()));
    
    const { onboardingData } = await request.json()
    console.log('📥 Received onboarding data:', onboardingData);
    
    // Extract authorization header and token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const refreshToken = request.headers.get('x-refresh-token');
    
    // Also check for tokens in request body
    const bodyTokens = (onboardingData as any)?.tokens;
    const bodyAccessToken = bodyTokens?.access_token;
    const bodyRefreshToken = bodyTokens?.refresh_token;
    
    // Use body tokens if header token is not available
    const accessToken = token || bodyAccessToken;
    const finalRefreshToken = refreshToken || bodyRefreshToken;
    
    console.log('🔐 Authorization header present:', !!authHeader);
    console.log('🔐 Authorization header:', authHeader);
    console.log('🔐 Extracted token length:', accessToken?.length || 0);
    console.log('🔐 Token starts with:', accessToken?.substring(0, 20) + '...');
    console.log('🔐 Refresh token from header:', !!refreshToken);
    console.log('🔐 Refresh token from body:', !!bodyRefreshToken);
    console.log('🔐 Final refresh token available:', !!finalRefreshToken);
    
    // Log token expiry if it's a JWT
    if (accessToken) {
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('🔐 Token expiry:', new Date(payload.exp * 1000).toISOString());
          console.log('🔐 Token issued at:', new Date(payload.iat * 1000).toISOString());
          console.log('🔐 Token subject (user ID):', payload.sub);
          console.log('🔐 Current time:', new Date().toISOString());
          console.log('🔐 Token expired:', Date.now() > payload.exp * 1000);
        }
      } catch (e) {
        console.log('🔐 Could not decode token payload:', e);
      }
    }
    
    // Create Supabase client - CRITICAL: Use authenticated user context, NOT service role
    let supabase;
    let user = null;
    let clientType = 'unknown';
    
    if (accessToken) {
      console.log('🔐 Creating Supabase client with token validation (no setSession)...');
      console.log('🔐 Token being used:', accessToken.substring(0, 50) + '...');
      
      try {
        // Method 1: Try with createRouteHandlerClient first (session-safe)
        console.log('🔐 Method 1: Using createRouteHandlerClient (session-safe)...');
        supabase = createRouteHandlerClient({ cookies });
        clientType = 'route_handler';
        console.log('✅ Supabase client created successfully - Type:', clientType);
        
        // AVOID setSession - instead validate token directly
        console.log('🔐 Validating token directly without setSession...');
        const { data: userData, error: userError } = await (supabase.auth as any).getUser(accessToken);
        
        if (userError) {
          console.error('❌ Error validating token:', userError);
          console.error('❌ User error code:', userError.code);
          console.error('❌ User error message:', userError.message);
          
          // Method 2: Try with service role client (session-safe) - BUT ONLY FOR VALIDATION
          console.log('🔐 Method 2: Trying with service role client for token validation only...');
          try {
            const serviceClient = createServiceRoleClient();
            const { data: serviceUserData, error: serviceUserError } = await serviceClient.auth.getUser(accessToken);
            
            if (serviceUserError) {
              console.error('❌ Error with service role client:', serviceUserError);
              return NextResponse.json({ 
                error: 'Failed to authenticate with provided token. Please ensure you are logged in.',
                code: 'AUTH_FAILED_ALL_METHODS',
                details: `User error: ${userError.message}, Service error: ${serviceUserError.message}`
              }, { status: 401 });
            } else {
              console.log('✅ Service role client authentication successful - BUT SWITCHING BACK TO USER CLIENT');
              user = serviceUserData.user;
              // CRITICAL: Don't use service client for database operations - switch back to user client
              supabase = createRouteHandlerClient({ cookies });
              clientType = 'route_handler_after_validation';
              console.log('🔄 Switched back to route handler client for database operations');
            }
          } catch (serviceError) {
            console.error('❌ Service role client error:', serviceError);
            return NextResponse.json({ 
              error: 'Failed to authenticate with provided token. Please ensure you are logged in.',
              code: 'AUTH_FAILED_ALL_METHODS',
              details: `User error: ${userError.message}, Service error: ${serviceError instanceof Error ? serviceError.message : 'Unknown'}`
            }, { status: 401 });
          }
        } else {
          console.log('✅ Direct token validation successful');
          user = userData.user;
        }
      } catch (error) {
        console.error('❌ Error creating Supabase client with token:', error);
        return NextResponse.json({ 
          error: 'Failed to initialize authentication. Please try again.',
          code: 'CLIENT_INIT_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      console.log('🔐 No token provided, using default Supabase client');
      supabase = createRouteHandlerClient({ cookies });
      clientType = 'route_handler_default';
    }
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }
    
    // Get current user - this will validate the token from headers (session-safe)
    if (!user) {
      console.log('🔐 Getting user from existing session (session-safe)...');
      const { data: { user: authUser }, error: authError } = await (supabase.auth as any).getUser()
      
      console.log('🔐 Auth check result - user exists:', !!authUser);
      console.log('🔐 Auth check result - auth error:', authError);
      console.log('🔐 User ID if exists:', authUser?.id);
      
      if (authError) {
        console.error('❌ Authentication error:', authError)
        console.error('❌ Auth error code:', authError.code);
        console.error('❌ Auth error message:', authError.message);
        return NextResponse.json({ 
          error: 'Authentication failed. Please ensure you are logged in.',
          code: 'AUTH_FAILED',
          details: authError.message
        }, { status: 401 })
      }
      
      if (!authUser) {
        console.error('❌ No authenticated user found')
        return NextResponse.json({ 
          error: 'Not authenticated. Please create an account to save your onboarding data.',
          code: 'AUTH_REQUIRED'
        }, { status: 401 })
      }
      
      user = authUser;
    }

    console.log('✅ User authenticated for onboarding completion:', user.id)
    console.log('✅ User email:', user.email)
    console.log('✅ User metadata:', user.user_metadata)
    console.log('✅ User app metadata:', user.app_metadata)
    console.log('🔐 Client type being used for database operations:', clientType)
    console.log('🔐 CRITICAL: Ensuring we use authenticated user context, NOT service role')

    // Determine auth method - preserve existing if already set, otherwise determine based on user data
    let authMethod = 'email'; // Default to email
    
    if (user.email && onboardingData.phoneNumber) {
      authMethod = 'both'; // User has both email and phone
    } else if (onboardingData.phoneNumber && !user.email) {
      authMethod = 'phone'; // User only has phone
    } else if (user.email && !onboardingData.phoneNumber) {
      // Check if it's Google auth or regular email
      if (user.app_metadata?.provider === 'google') {
        authMethod = 'google';
      } else {
        authMethod = 'email'; // Regular email auth
      }
    }
    
    console.log('🔐 Determined new auth method:', authMethod);

    // Prepare profile data
    const profileData = {
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      phone: onboardingData.phoneNumber,
      address: onboardingData.location,
      city: onboardingData.location?.split(',')[0]?.trim(),
      state: onboardingData.location?.split(',')[1]?.trim(),
      zip_code: onboardingData.location?.split(',')[2]?.trim(),
      vehicles: [onboardingData.vehicle, ...onboardingData.additionalVehicles],
      referral_source: onboardingData.referralSource,
      last_service: onboardingData.lastService,
      notifications_enabled: onboardingData.notifications,
      communication_preferences: { notifications: onboardingData.notifications },
      notification_settings: { enabled: onboardingData.notifications },
      onboarding_completed: true, // This is the key field that must be set to true
      onboarding_type: onboardingData.onboardingType || 'full', // Use frontend value, fallback to 'full'
      profile_completed_at: new Date().toISOString(),
      onboarding_data: onboardingData,
      subscription_plan: onboardingData.plan,
      subscription_status: onboardingData.freeTrial ? 'trial' : 'inactive',
      free_trial_ends_at: onboardingData.freeTrial ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      // Add auth method tracking
      auth_method: authMethod,
      updated_at: new Date().toISOString()
    }

    console.log('📝 Profile data prepared with onboarding_completed: true');
    console.log('📝 User email:', user.email, 'Phone:', onboardingData.phoneNumber, 'Auth method:', authMethod);
    console.log('📝 Provider:', user.app_metadata?.provider);
    console.log('📝 Key fields - onboarding_completed:', profileData.onboarding_completed, 'auth_method:', profileData.auth_method);
    console.log('📝 Onboarding type from frontend:', onboardingData.onboardingType);
    console.log('📝 Onboarding type being used:', profileData.onboarding_type);
    console.log('📝 Full profile data being sent to database:', JSON.stringify(profileData, null, 2));

    // Check if auth_method column exists in user_profiles table
    console.log('🔍 Checking if auth_method column exists in user_profiles table...');
    try {
      const { data: columnCheck, error: columnError } = await supabase
        .from('user_profiles')
        .select('auth_method')
        .limit(1);
      
      if (columnError && columnError.code === '42703') {
        console.error('❌ auth_method column does not exist in user_profiles table');
        console.error('❌ Column error:', columnError);
        
        // Remove auth_method from profileData if column doesn't exist
        console.log('🔧 Removing auth_method from profile data since column does not exist');
        delete (profileData as { auth_method?: string }).auth_method;
        console.log('📝 Updated profile data without auth_method:', JSON.stringify(profileData, null, 2));
      } else if (columnError) {
        console.error('❌ Error checking auth_method column:', columnError);
      } else {
        console.log('✅ auth_method column exists in user_profiles table');
      }
    } catch (checkError) {
      console.error('❌ Error checking column existence:', checkError);
    }

    // CRITICAL: Check if profile exists before deciding INSERT vs UPDATE
    console.log('🔍 Checking if user profile exists for user_id:', user.id);
    const { data: profileCheck, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, onboarding_completed, auth_method, user_id')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Profile check result:');
    console.log('🔍 - Profile check data:', profileCheck);
    console.log('🔍 - Profile check error:', profileCheckError);
    console.log('🔍 - Profile check error code:', profileCheckError?.code);
    console.log('🔍 - Profile check error message:', profileCheckError?.message);

    if (profileCheckError) {
      if (profileCheckError.code === 'PGRST116') {
        // No profile found - this is expected for new users
        console.log('📋 No existing profile found (PGRST116) - will INSERT new profile');
        console.log('📋 - Profile check data: null');
        console.log('📋 - Profile check error code: PGRST116 (no rows found)');
      } else {
        // Other error - this is unexpected
        console.error('❌ Error checking existing profile:', profileCheckError);
        console.error('❌ Profile check error code:', profileCheckError.code);
        console.error('❌ Profile check error message:', profileCheckError.message);
        return NextResponse.json({ 
          error: 'Failed to check existing profile',
          code: 'PROFILE_CHECK_FAILED',
          details: profileCheckError.message
        }, { status: 500 });
      }
    }

    const existingProfile = profileCheck;
    console.log('📋 Profile existence check result:');
    console.log('📋 - Profile exists:', !!existingProfile);
    console.log('📋 - Profile ID if exists:', existingProfile?.id);
    console.log('📋 - Profile onboarding_completed if exists:', existingProfile?.onboarding_completed);
    console.log('📋 - Profile user_id if exists:', existingProfile?.user_id);

    let profileOperationResult;
    let operationType = 'unknown';
    
    if (existingProfile && existingProfile.id) {
      // UPDATE existing profile
      operationType = 'UPDATE';
      console.log('📝 UPDATING existing user profile...');
      console.log('📝 Using authenticated user ID for update:', user.id);
      console.log('📝 Existing profile ID:', existingProfile.id);
      console.log('📝 Existing profile - onboarding_completed:', existingProfile.onboarding_completed, 'auth_method:', existingProfile.auth_method);
      console.log('📝 Profile data to update:', JSON.stringify(profileData, null, 2));
      console.log('🔐 CRITICAL: Client type for update operation:', clientType);
      console.log('🔐 CRITICAL: Authenticated user ID:', user.id);
      console.log('🔐 CRITICAL: Profile user_id should match:', user.id);
      
      profileOperationResult = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id) // Use authenticated user's ID
        .select('id, onboarding_completed, auth_method, user_id')
    } else {
      // INSERT new profile
      operationType = 'INSERT';
      console.log('📝 INSERTING new user profile...');
      console.log('📝 Using authenticated user ID for creation:', user.id);
      console.log('📝 No existing profile found, creating new one');
      console.log('📝 Profile data to insert:', JSON.stringify({ user_id: user.id, ...profileData }, null, 2));
      console.log('🔐 CRITICAL: Client type for insert operation:', clientType);
      console.log('🔐 CRITICAL: Authenticated user ID:', user.id);
      console.log('🔐 CRITICAL: Insert user_id will be:', user.id);
      
      profileOperationResult = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id, // Use authenticated user's ID
          ...profileData
        })
        .select('id, onboarding_completed, auth_method, user_id')
    }

    console.log('📝 Profile operation result:', profileOperationResult);
    console.log('📝 Operation type performed:', operationType);

    if (profileOperationResult.error) {
      console.error('❌ Error updating user profile:', profileOperationResult.error)
      console.error('❌ Error code:', profileOperationResult.error.code)
      console.error('❌ Error message:', profileOperationResult.error.message)
      console.error('❌ Error details:', profileOperationResult.error.details)
      console.error('❌ Error hint:', profileOperationResult.error.hint)
      console.error('❌ Full error object:', JSON.stringify(profileOperationResult.error, null, 2))
      
      // CRITICAL: Log authentication context for RLS debugging
      console.error('🔐 CRITICAL RLS DEBUGGING INFO:')
      console.error('🔐 - Client type used:', clientType)
      console.error('🔐 - Authenticated user ID:', user.id)
      console.error('🔐 - User email:', user.email)
      console.error('🔐 - User app_metadata:', JSON.stringify(user.app_metadata, null, 2))
      console.error('🔐 - User user_metadata:', JSON.stringify(user.user_metadata, null, 2))
      console.error('🔐 - Access token provided:', !!accessToken)
      console.error('🔐 - Access token length:', accessToken?.length || 0)
      
      // Check for specific error types
      if (profileOperationResult.error.code === '42703') {
        console.error('❌ COLUMN NOT FOUND ERROR: This indicates a missing column in the database')
        console.error('❌ Likely missing column: auth_method')
        return NextResponse.json({ 
          error: 'Database schema error: Missing column. Please contact support.',
          code: 'SCHEMA_ERROR',
          details: profileOperationResult.error.message,
          hint: 'The auth_method column may not exist in the user_profiles table'
        }, { status: 500 })
      }
      
      if (profileOperationResult.error.code === '23502') {
        console.error('❌ NOT NULL CONSTRAINT ERROR: Required field is missing')
        return NextResponse.json({ 
          error: 'Missing required field in profile data.',
          code: 'MISSING_REQUIRED_FIELD',
          details: profileOperationResult.error.message,
          hint: 'Check that all required fields are provided'
        }, { status: 400 })
      }
      
      if (profileOperationResult.error.code === '23505') {
        console.error('❌ UNIQUE CONSTRAINT ERROR: Duplicate value')
        return NextResponse.json({ 
          error: 'Duplicate profile data detected.',
          code: 'DUPLICATE_DATA',
          details: profileOperationResult.error.message,
          hint: 'A profile with this data already exists'
        }, { status: 409 })
      }
      
      if (profileOperationResult.error.code === '23514') {
        console.error('❌ CHECK CONSTRAINT ERROR: Data validation failed')
        return NextResponse.json({ 
          error: 'Invalid profile data provided.',
          code: 'INVALID_DATA',
          details: profileOperationResult.error.message,
          hint: 'Check that all data values are valid'
        }, { status: 400 })
      }
      
      if (profileOperationResult.error.code === '406' || profileOperationResult.error.code === '401') {
        console.error('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.')
        console.error('🔐 RLS DEBUGGING - This is likely the issue:')
        console.error('🔐 - Error code:', profileOperationResult.error.code)
        console.error('🔐 - Error message:', profileOperationResult.error.message)
        console.error('🔐 - Client type used:', clientType)
        console.error('🔐 - Authenticated user ID:', user.id)
        console.error('🔐 - Profile data user_id:', existingProfile ? 'update operation' : user.id)
        console.error('🔐 - Operation type:', existingProfile ? 'UPDATE' : 'INSERT')
        console.error('🔐 - RLS policies should allow authenticated users to insert/update their own profiles')
        console.error('🔐 - Check if auth.uid() = user_id in RLS policies')
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you are logged in and have proper permissions.',
          code: profileOperationResult.error.code,
          details: profileOperationResult.error.message,
          hint: 'Check RLS policies and user authentication',
          debug: {
            clientType,
            authenticatedUserId: user.id,
            operationType: existingProfile ? 'UPDATE' : 'INSERT',
            rlsError: true
          }
        }, { status: profileOperationResult.error.code })
      }
      
      // Generic database error with full details
      return NextResponse.json({ 
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
        details: profileOperationResult.error.message,
        hint: profileOperationResult.error.hint,
        fullError: profileOperationResult.error,
        debug: {
          clientType,
          authenticatedUserId: user.id,
          operationType: existingProfile ? 'UPDATE' : 'INSERT'
        }
      }, { status: 500 })
    }

    console.log('✅ User profile updated successfully:', profileOperationResult.data?.[0]?.id);
    console.log('✅ Profile onboarding_completed flag:', profileOperationResult.data?.[0]?.onboarding_completed);
    console.log('✅ Profile auth_method:', profileOperationResult.data?.[0]?.auth_method);
    console.log('✅ Profile user_id:', profileOperationResult.data?.[0]?.user_id);
    
    // CRITICAL: Update users table onboarding_completed status (primary source)
    console.log('🔐 Updating users table onboarding_completed status...');
    console.log('🔐 Using authenticated user ID for users table update:', user.id);
    console.log('🔐 Client type for users table update:', clientType);
    
    const { data: userUpdateResult, error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, onboarding_completed, updated_at')
    
    if (userUpdateError) {
      console.error('❌ Error updating users table onboarding status:', userUpdateError);
      console.error('❌ User update error code:', userUpdateError.code);
      console.error('❌ User update error message:', userUpdateError.message);
      console.error('🔐 CRITICAL: Users table update failed - this is the primary source!');
      
      return NextResponse.json({ 
        error: 'Failed to update user onboarding status',
        code: 'USER_UPDATE_FAILED',
        details: userUpdateError.message,
        hint: 'The users table onboarding_completed status could not be updated',
        debug: {
          clientType,
          authenticatedUserId: user.id,
          operationType: 'USERS_UPDATE',
          rlsError: userUpdateError.code === '406' || userUpdateError.code === '401'
        }
      }, { status: 500 });
    }
    
    console.log('✅ Users table updated successfully:', userUpdateResult.data?.[0]?.id);
    console.log('✅ Users table onboarding_completed:', userUpdateResult.data?.[0]?.onboarding_completed);
    console.log('✅ Users table updated_at:', userUpdateResult.data?.[0]?.updated_at);
    
    // Double-check that the profile was actually updated
    console.log('🔍 Double-checking profile update...');
    console.log('🔍 Verifying profile with authenticated user ID:', user.id);
    const { data: verificationProfile, error: verificationError } = await supabase
      .from('user_profiles')
      .select('onboarding_completed, auth_method, user_id, id')
      .eq('user_id', user.id) // Use authenticated user's ID for verification
      .single();
      
    if (verificationError) {
      console.error('❌ Error verifying profile update:', verificationError);
      console.error('❌ Verification error code:', verificationError.code);
      console.error('❌ Verification error message:', verificationError.message);
    } else {
      console.log('✅ Verification - Profile onboarding_completed:', verificationProfile?.onboarding_completed);
      console.log('✅ Verification - Profile auth_method:', verificationProfile?.auth_method);
      console.log('✅ Verification - Profile user_id:', verificationProfile?.user_id);
      console.log('✅ Verification - Profile id:', verificationProfile?.id);
      
      if (!verificationProfile?.onboarding_completed) {
        console.error('❌ CRITICAL: Profile still shows onboarding_completed: false after update!');
        console.error('❌ Full verification profile:', verificationProfile);
      } else {
        console.log('✅ SUCCESS: Profile properly updated with onboarding_completed: true');
      }
      
      if (!verificationProfile?.auth_method) {
        console.error('❌ CRITICAL: Profile still shows auth_method: null after update!');
        console.error('❌ Expected auth_method to be set, but got:', verificationProfile?.auth_method);
      } else {
        console.log('✅ SUCCESS: Profile properly updated with auth_method:', verificationProfile?.auth_method);
      }
    }
    
    const responseData = { 
      success: true, 
      profile_id: profileOperationResult.data?.[0]?.id,
      onboarding_completed: profileOperationResult.data?.[0]?.onboarding_completed,
      auth_method: profileOperationResult.data?.[0]?.auth_method
    };
    
    console.log('🚀 Returning success response (session-safe):', responseData);
    
    // Return response WITHOUT any Set-Cookie headers to preserve frontend session
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('❌ Error in onboarding completion:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error constructor:', error?.constructor?.name)
    
    // Safely access error.stack only if it's an Error instance
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    } else {
      console.error('❌ Error stack: (not an Error instance)', error)
    }
    
    console.error('❌ Full error object:', JSON.stringify(error, null, 2))
    
    // Provide more specific error information
    let errorMessage = 'Internal server error'
    let errorCode = 'INTERNAL_ERROR'
    let errorDetails = 'An unexpected error occurred'
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || 'No stack trace available'
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      // Safely access message property if it exists
      errorMessage = (error as any).message || 'Unknown object error'
      errorDetails = JSON.stringify(error)
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: 'Check server logs for more detailed error information'
    }, { status: 500 })
  }
}
