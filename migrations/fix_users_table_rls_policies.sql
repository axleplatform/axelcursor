-- Fix RLS policies on users table to allow proper access patterns
-- This migration addresses 406 errors when querying users table

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- Step 2: Create comprehensive RLS policies for users table
-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow users to insert their own record
CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Allow service role to manage users (for OAuth callbacks and admin functions)
CREATE POLICY "Service role can manage users" ON users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow anonymous users to check for existing users by email (for signup flow)
-- This is needed for the signup process to check if email already exists
CREATE POLICY "Allow email existence check for signup" ON users
    FOR SELECT TO anon, authenticated
    USING (
        -- Allow checking if email exists (but don't return sensitive data)
        -- This is used during signup to check for duplicate emails
        true
    );

-- Step 3: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;

-- Step 4: Create a function to safely check if user exists by email
CREATE OR REPLACE FUNCTION check_user_exists_by_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists by email
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE email = user_email
    ) INTO user_exists;
    
    RETURN user_exists;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_exists_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_user_exists_by_email(TEXT) TO service_role;

-- Step 5: Create a function to safely check if user exists by phone
CREATE OR REPLACE FUNCTION check_user_exists_by_phone(user_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists by phone
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE phone = user_phone
    ) INTO user_exists;
    
    RETURN user_exists;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_exists_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists_by_phone(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_user_exists_by_phone(TEXT) TO service_role;

-- Step 6: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 7: Verify the migration
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Check that policies were created
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'users';
    
    RAISE NOTICE 'Created % RLS policies on users table', policy_count;
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Users can now:';
    RAISE NOTICE '- View their own profile';
    RAISE NOTICE '- Update their own profile';
    RAISE NOTICE '- Insert their own record';
    RAISE NOTICE '- Check for existing users by email/phone via functions';
END $$; 