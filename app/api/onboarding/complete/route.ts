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

    // Check if user profile exists first - use authenticated user's ID
    console.log('🔍 Checking for existing profile with authenticated user ID:', user.id);
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, onboarding_completed, auth_method, user_id')
      .eq('user_id', user.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Profile check error:', profileCheckError)
      console.error('❌ Profile check error code:', profileCheckError.code);
      console.error('❌ Profile check error message:', profileCheckError.message);
      if (profileCheckError.code === '406' || profileCheckError.code === '401') {
        console.warn('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.')
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you are logged in and have proper permissions.',
          code: profileCheckError.code 
        }, { status: profileCheckError.code })
      }
      return NextResponse.json({ error: 'Failed to check user profile' }, { status: 500 })
    }

    console.log('📋 Current profile status - exists:', !!existingProfile);
    console.log('📋 Profile details - onboarding_completed:', existingProfile?.onboarding_completed);
    console.log('📋 Profile details - auth_method:', existingProfile?.auth_method);
    console.log('📋 Profile details - user_id:', existingProfile?.user_id);
    console.log('📋 Profile details - profile_id:', existingProfile?.id);

    // Determine auth method - preserve existing if already set, otherwise determine based on user data
    let authMethod = existingProfile?.auth_method;
    
    if (!authMethod) {
      // Only determine auth method if not already set
      authMethod = 'email'; // Default to email
      
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
    } else {
      console.log('🔐 Preserving existing auth method:', authMethod);
    }

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
      onboarding_type: 'full',
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
        delete profileData.auth_method;
        console.log('📝 Updated profile data without auth_method:', JSON.stringify(profileData, null, 2));
      } else if (columnError) {
        console.error('❌ Error checking auth_method column:', columnError);
      } else {
        console.log('✅ auth_method column exists in user_profiles table');
      }
    } catch (checkError) {
      console.error('❌ Error checking column existence:', checkError);
    }

    let updateResult;
    if (existingProfile) {
      // Update existing profile - use authenticated user's ID
      console.log('📝 Updating existing user profile...')
      console.log('📝 Using authenticated user ID for update:', user.id);
      console.log('📝 Existing profile - onboarding_completed:', existingProfile.onboarding_completed, 'auth_method:', existingProfile.auth_method);
      console.log('📝 Profile data to update:', JSON.stringify(profileData, null, 2));
      console.log('🔐 CRITICAL: Client type for update operation:', clientType);
      console.log('🔐 CRITICAL: Authenticated user ID:', user.id);
      console.log('🔐 CRITICAL: Profile user_id should match:', user.id);
      
      updateResult = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id) // Use authenticated user's ID
        .select('id, onboarding_completed, auth_method, user_id')
    } else {
      // Create new profile - use authenticated user's ID
      console.log('📝 Creating new user profile...')
      console.log('📝 Using authenticated user ID for creation:', user.id);
      console.log('📝 No existing profile found, creating new one');
      console.log('📝 Profile data to insert:', JSON.stringify({ user_id: user.id, ...profileData }, null, 2));
      console.log('🔐 CRITICAL: Client type for insert operation:', clientType);
      console.log('🔐 CRITICAL: Authenticated user ID:', user.id);
      console.log('🔐 CRITICAL: Insert user_id will be:', user.id);
      
      updateResult = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id, // Use authenticated user's ID
          ...profileData
        })
        .select('id, onboarding_completed, auth_method, user_id')
    }

    console.log('📝 Update result:', updateResult);

    if (updateResult.error) {
      console.error('❌ Error updating user profile:', updateResult.error)
      console.error('❌ Error code:', updateResult.error.code)
      console.error('❌ Error message:', updateResult.error.message)
      console.error('❌ Error details:', updateResult.error.details)
      console.error('❌ Error hint:', updateResult.error.hint)
      console.error('❌ Full error object:', JSON.stringify(updateResult.error, null, 2))
      
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
      if (updateResult.error.code === '42703') {
        console.error('❌ COLUMN NOT FOUND ERROR: This indicates a missing column in the database')
        console.error('❌ Likely missing column: auth_method')
        return NextResponse.json({ 
          error: 'Database schema error: Missing column. Please contact support.',
          code: 'SCHEMA_ERROR',
          details: updateResult.error.message,
          hint: 'The auth_method column may not exist in the user_profiles table'
        }, { status: 500 })
      }
      
      if (updateResult.error.code === '23502') {
        console.error('❌ NOT NULL CONSTRAINT ERROR: Required field is missing')
        return NextResponse.json({ 
          error: 'Missing required field in profile data.',
          code: 'MISSING_REQUIRED_FIELD',
          details: updateResult.error.message,
          hint: 'Check that all required fields are provided'
        }, { status: 400 })
      }
      
      if (updateResult.error.code === '23505') {
        console.error('❌ UNIQUE CONSTRAINT ERROR: Duplicate value')
        return NextResponse.json({ 
          error: 'Duplicate profile data detected.',
          code: 'DUPLICATE_DATA',
          details: updateResult.error.message,
          hint: 'A profile with this data already exists'
        }, { status: 409 })
      }
      
      if (updateResult.error.code === '23514') {
        console.error('❌ CHECK CONSTRAINT ERROR: Data validation failed')
        return NextResponse.json({ 
          error: 'Invalid profile data provided.',
          code: 'INVALID_DATA',
          details: updateResult.error.message,
          hint: 'Check that all data values are valid'
        }, { status: 400 })
      }
      
      if (updateResult.error.code === '406' || updateResult.error.code === '401') {
        console.error('⚠️ RLS/Authentication issue detected. Check user permissions and RLS policies.')
        console.error('🔐 RLS DEBUGGING - This is likely the issue:')
        console.error('🔐 - Error code:', updateResult.error.code)
        console.error('🔐 - Error message:', updateResult.error.message)
        console.error('🔐 - Client type used:', clientType)
        console.error('🔐 - Authenticated user ID:', user.id)
        console.error('🔐 - Profile data user_id:', existingProfile ? 'update operation' : user.id)
        console.error('🔐 - Operation type:', existingProfile ? 'UPDATE' : 'INSERT')
        console.error('🔐 - RLS policies should allow authenticated users to insert/update their own profiles')
        console.error('🔐 - Check if auth.uid() = user_id in RLS policies')
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you are logged in and have proper permissions.',
          code: updateResult.error.code,
          details: updateResult.error.message,
          hint: 'Check RLS policies and user authentication',
          debug: {
            clientType,
            authenticatedUserId: user.id,
            operationType: existingProfile ? 'UPDATE' : 'INSERT',
            rlsError: true
          }
        }, { status: updateResult.error.code })
      }
      
      // Generic database error with full details
      return NextResponse.json({ 
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
        details: updateResult.error.message,
        hint: updateResult.error.hint,
        fullError: updateResult.error,
        debug: {
          clientType,
          authenticatedUserId: user.id,
          operationType: existingProfile ? 'UPDATE' : 'INSERT'
        }
      }, { status: 500 })
    }

    console.log('✅ User profile updated successfully:', updateResult.data?.[0]?.id);
    console.log('✅ Profile onboarding_completed flag:', updateResult.data?.[0]?.onboarding_completed);
    console.log('✅ Profile auth_method:', updateResult.data?.[0]?.auth_method);
    console.log('✅ Profile user_id:', updateResult.data?.[0]?.user_id);
    
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
      profile_id: updateResult.data?.[0]?.id,
      onboarding_completed: updateResult.data?.[0]?.onboarding_completed,
      auth_method: updateResult.data?.[0]?.auth_method
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
