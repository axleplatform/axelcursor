# Authentication Debug Guide for Onboarding Completion API

## Issue Summary
The onboarding completion API (`/api/onboarding/complete`) is failing with a 401 "Auth session missing!" error even though the frontend sends the access token.

## Implemented Debugging Features

### 1. Enhanced Token Logging

#### Frontend Logging (app/onboarding/customer/flow/page.tsx)
- ✅ Logs session data availability
- ✅ Logs access token and refresh token availability
- ✅ Decodes JWT token to show expiry, issue time, and user ID
- ✅ Shows if token is expired
- ✅ Sends both access token and refresh token to API

#### Backend Logging (app/api/onboarding/complete/route.ts)
- ✅ Logs all request headers
- ✅ Extracts and logs authorization header
- ✅ Decodes JWT token to show expiry, issue time, and user ID
- ✅ Shows if token is expired
- ✅ Logs token length and first 20 characters
- ✅ Handles tokens from both headers and request body

### 2. Multiple Authentication Strategies

The API now tries three different authentication methods:

1. **Method 1**: `setSession()` with access token and refresh token
2. **Method 2**: `getUser()` directly with access token
3. **Method 3**: Service role client with access token

### 3. Comprehensive Error Handling

- ✅ Detailed error logging for each authentication method
- ✅ Specific error codes and messages
- ✅ Fallback strategies when primary methods fail
- ✅ Service role client as final fallback

## Debugging Steps

### Step 1: Check Frontend Token Logging
1. Open browser developer tools
2. Navigate to onboarding completion step
3. Check console for token logs:
   ```
   🔐 Session data available: true/false
   🔐 Access token available: true/false
   🔐 Refresh token available: true/false
   🔐 Frontend - Token expiry: [timestamp]
   🔐 Frontend - Token expired: true/false
   ```

### Step 2: Check Backend Token Logging
1. Check server logs for API call
2. Look for token extraction logs:
   ```
   🔐 Authorization header present: true/false
   🔐 Extracted token length: [number]
   🔐 Token starts with: [first 20 chars]...
   🔐 Token expiry: [timestamp]
   🔐 Token expired: true/false
   ```

### Step 3: Check Authentication Method Results
Look for authentication method logs:
```
🔐 Method 1: Using createRouteHandlerClient with token...
✅ Session set successfully with token
```
OR
```
❌ Error setting session with token: [error]
🔐 Method 2: Trying getUser directly with token...
✅ Direct getUser authentication successful
```
OR
```
❌ Error getting user with token: [error]
🔐 Method 3: Trying with service role client...
✅ Service role client authentication successful
```

### Step 4: Run Test Script
```bash
node test-auth.js
```

This will test:
- Supabase client creation
- Session retrieval
- User retrieval
- Token decoding and expiry

## Common Issues and Solutions

### Issue 1: Token Expired
**Symptoms**: Token expiry time is in the past
**Solution**: Implement token refresh logic or re-authenticate user

### Issue 2: Missing Environment Variables
**Symptoms**: Supabase client creation fails
**Solution**: Check `.env.local` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Issue 3: CORS Issues
**Symptoms**: Request fails before reaching API
**Solution**: Check browser network tab for CORS errors

### Issue 4: RLS Policies
**Symptoms**: Authentication succeeds but database operations fail
**Solution**: Check Supabase RLS policies for `user_profiles` table

### Issue 5: Session Persistence
**Symptoms**: Token exists but session is not maintained
**Solution**: Check cookie settings and session storage

## Environment Variables Required

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For Vercel deployment
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing the Fix

1. **Local Testing**:
   ```bash
   npm run dev
   # Navigate to onboarding flow
   # Check console logs
   ```

2. **Production Testing**:
   - Deploy to Vercel
   - Check Vercel function logs
   - Monitor API responses

3. **Token Validation**:
   - Use JWT.io to decode tokens
   - Verify token structure and claims
   - Check token expiry

## Expected Log Flow

### Successful Authentication:
```
🚀 Onboarding completion API called
📥 Request headers: [headers]
🔐 Authorization header present: true
🔐 Extracted token length: [length]
🔐 Token starts with: [prefix]...
🔐 Token expiry: [timestamp]
🔐 Token expired: false
🔐 Method 1: Using createRouteHandlerClient with token...
✅ Session set successfully with token
✅ User authenticated for onboarding completion: [user_id]
📝 Profile data prepared with onboarding_completed: true
✅ User profile updated successfully: [profile_id]
🚀 Returning success response: [response]
```

### Failed Authentication:
```
🚀 Onboarding completion API called
📥 Request headers: [headers]
🔐 Authorization header present: false
❌ No token provided, using default Supabase client
🔐 Getting user after session setup...
❌ Authentication error: [error]
```

## Next Steps

1. **Monitor Logs**: Check both frontend and backend logs for the specific error pattern
2. **Token Analysis**: Verify token format, expiry, and claims
3. **Environment Check**: Ensure all environment variables are set correctly
4. **RLS Verification**: Check database policies and permissions
5. **Session Debugging**: Verify session persistence across requests

## Contact Information

If the issue persists after following this guide:
1. Collect all console logs (frontend and backend)
2. Note the specific error messages and codes
3. Check environment variable configuration
4. Verify Supabase project settings 