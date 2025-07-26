# Onboarding Completion 500 Error Debug Guide

## Issue Summary
The onboarding completion API is failing with a 500 error: "Failed to save onboarding data" after the session loss fixes were implemented.

## Root Cause Analysis

### Potential Causes:
1. **Missing Database Column**: The `auth_method` column might not exist in the `user_profiles` table
2. **RLS Policy Issues**: Row Level Security policies might be blocking the update/insert
3. **Data Validation Errors**: Required fields might be missing or invalid
4. **Constraint Violations**: Unique constraints or check constraints might be failing
5. **Permission Issues**: User might not have proper permissions to update their profile

## Implemented Fixes

### 1. Enhanced Error Handling (Primary Fix)

**File**: `app/api/onboarding/complete/route.ts`

**Changes**:
- ✅ **Detailed Error Logging** - Log full Supabase error objects
- ✅ **Specific Error Codes** - Handle different PostgreSQL error codes
- ✅ **Column Existence Check** - Check if `auth_method` column exists
- ✅ **Dynamic Data Adjustment** - Remove missing columns from data
- ✅ **Comprehensive Error Responses** - Return detailed error information

**Key Error Handling Features**:
\`\`\`typescript
// Specific error code handling
if (updateResult.error.code === '42703') {
  // Column not found error
  return NextResponse.json({ 
    error: 'Database schema error: Missing column. Please contact support.',
    code: 'SCHEMA_ERROR',
    details: updateResult.error.message,
    hint: 'The auth_method column may not exist in the user_profiles table'
  }, { status: 500 })
}

// Column existence check
const { data: columnCheck, error: columnError } = await supabase
  .from('user_profiles')
  .select('auth_method')
  .limit(1);

if (columnError && columnError.code === '42703') {
  // Remove auth_method from profileData if column doesn't exist
  delete profileData.auth_method;
}
\`\`\`

### 2. Database Schema Migration

**File**: `migrations/add_auth_method_column.sql`

**Changes**:
- ✅ **Add Missing Column** - Add `auth_method` column if it doesn't exist
- ✅ **Index Creation** - Add index for better performance
- ✅ **Column Documentation** - Add comment explaining the column purpose

\`\`\`sql
-- Add auth_method column to user_profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'auth_method'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN auth_method TEXT;
    END IF;
END $$;
\`\`\`

### 3. Enhanced Logging

**File**: `app/api/onboarding/complete/route.ts`

**Changes**:
- ✅ **Profile Data Logging** - Log exact data being sent to database
- ✅ **Column Check Logging** - Log column existence verification
- ✅ **Error Object Logging** - Log full error objects for debugging
- ✅ **Stack Trace Logging** - Log error stack traces

## Debugging Steps

### Step 1: Check API Logs
Look for detailed error information in the API logs:

**Expected Logs (Success)**:
\`\`\`
📝 Profile data prepared with onboarding_completed: true
🔍 Checking if auth_method column exists in user_profiles table...
✅ auth_method column exists in user_profiles table
📝 Full profile data being sent to database: {...}
📝 Update result: { data: [...], error: null }
✅ User profile updated successfully: [profile_id]
\`\`\`

**Problematic Logs (Column Missing)**:
\`\`\`
🔍 Checking if auth_method column exists in user_profiles table...
❌ auth_method column does not exist in user_profiles table
🔧 Removing auth_method from profile data since column does not exist
📝 Updated profile data without auth_method: {...}
\`\`\`

**Problematic Logs (Database Error)**:
\`\`\`
❌ Error updating user profile: {...}
❌ Error code: 42703
❌ Error message: column "auth_method" does not exist
❌ Full error object: {...}
\`\`\`

### Step 2: Check Error Response
Look for specific error codes in the API response:

**Column Missing Error**:
\`\`\`json
{
  "error": "Database schema error: Missing column. Please contact support.",
  "code": "SCHEMA_ERROR",
  "details": "column \"auth_method\" does not exist",
  "hint": "The auth_method column may not exist in the user_profiles table"
}
\`\`\`

**RLS Error**:
\`\`\`json
{
  "error": "Access denied. Please ensure you are logged in and have proper permissions.",
  "code": "406",
  "details": "new row violates row-level security policy",
  "hint": "Check RLS policies and user authentication"
}
\`\`\`

**Data Validation Error**:
\`\`\`json
{
  "error": "Missing required field in profile data.",
  "code": "MISSING_REQUIRED_FIELD",
  "details": "null value in column \"email\" violates not-null constraint",
  "hint": "Check that all required fields are provided"
}
\`\`\`

### Step 3: Check Database Schema
Verify the database schema:

\`\`\`sql
-- Check if auth_method column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'auth_method';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';
\`\`\`

### Step 4: Check User Permissions
Verify user authentication and permissions:

\`\`\`sql
-- Check if user exists and is authenticated
SELECT id, email, role, profile_status 
FROM auth.users 
WHERE id = '[user_id]';

-- Check if user profile exists
SELECT id, user_id, email, onboarding_completed 
FROM user_profiles 
WHERE user_id = '[user_id]';
\`\`\`

## Common Issues and Solutions

### Issue 1: Missing auth_method Column
**Symptoms**: Error code 42703, "column does not exist"
**Solution**: Run the migration `add_auth_method_column.sql`

### Issue 2: RLS Policy Blocking
**Symptoms**: Error code 406, "violates row-level security policy"
**Solution**: Check RLS policies and ensure user has proper permissions

### Issue 3: Required Field Missing
**Symptoms**: Error code 23502, "null value violates not-null constraint"
**Solution**: Ensure all required fields are provided in profile data

### Issue 4: Unique Constraint Violation
**Symptoms**: Error code 23505, "duplicate key value violates unique constraint"
**Solution**: Check for duplicate data or use UPSERT instead of INSERT

### Issue 5: Data Type Mismatch
**Symptoms**: Error code 22P02, "invalid text representation"
**Solution**: Ensure data types match column definitions

## Testing the Fix

### 1. Run Database Migration
\`\`\`bash
# Apply the auth_method column migration
psql -d your_database -f migrations/add_auth_method_column.sql
\`\`\`

### 2. Test API with Enhanced Logging
\`\`\`bash
# Start the development server
npm run dev

# Complete onboarding and check logs for:
# - Column existence check
# - Profile data being sent
# - Any database errors
\`\`\`

### 3. Verify Database Schema
\`\`\`sql
-- Verify auth_method column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'auth_method';
\`\`\`

## Expected Behavior After Fix

1. **Column Check**: API checks if `auth_method` column exists
2. **Dynamic Adjustment**: Removes missing columns from data
3. **Detailed Errors**: Returns specific error codes and messages
4. **Successful Updates**: Profile updates complete without 500 errors
5. **Proper Logging**: All operations are logged for debugging

## Monitoring Checklist

- [ ] API logs show column existence check
- [ ] No 42703 (column not found) errors
- [ ] Profile data is properly formatted
- [ ] RLS policies allow user operations
- [ ] All required fields are provided
- [ ] Database operations complete successfully
- [ ] Detailed error information is logged

## Next Steps

1. **Deploy Migration**: Apply the `add_auth_method_column.sql` migration
2. **Deploy API Changes**: Push the enhanced error handling
3. **Test Onboarding**: Complete onboarding flow and check logs
4. **Monitor Errors**: Watch for specific error patterns
5. **Verify Schema**: Ensure all required columns exist

The enhanced error handling and column existence check should resolve the 500 error and provide clear debugging information for any remaining issues.
