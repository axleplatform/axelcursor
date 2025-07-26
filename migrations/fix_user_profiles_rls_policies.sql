-- Fix RLS policies for user_profiles table to allow profile creation during signup
-- This migration addresses the "new row violates row-level security policy" error

-- Step 1: Enable RLS on user_profiles (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;

-- Step 3: Create comprehensive RLS policies for user_profiles table

-- Allow users to insert their own profile (for signup/profile creation)
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to do everything (for admin/API operations)
CREATE POLICY "Service role has full access" ON user_profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 4: Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Step 5: Create a function to safely create user profiles (for triggers)
CREATE OR REPLACE FUNCTION create_user_profile_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user_profile already exists
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = NEW.id) THEN
        INSERT INTO user_profiles (
            id,
            user_id,
            email,
            phone,
            full_name,
            onboarding_completed,
            onboarding_type,
            notifications_enabled,
            subscription_status,
            subscription_plan,
            vehicles,
            onboarding_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            false,
            COALESCE(NEW.raw_user_meta_data->>'onboarding_type', 'standard'),
            true,
            'free',
            'basic',
            '[]'::jsonb,
            '{}'::jsonb,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created user profile for user % with email %', NEW.id, NEW.email;
    ELSE
        RAISE NOTICE 'User profile already exists for user %', NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

-- Step 7: Create the trigger
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_trigger();

-- Step 8: Grant permissions for the trigger function
GRANT EXECUTE ON FUNCTION create_user_profile_trigger() TO service_role;

-- Step 9: Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Customer profile information - separate from mechanic_profiles';
COMMENT ON COLUMN user_profiles.onboarding_type IS 'Type of onboarding completed: standard, post_appointment, full, etc.';
COMMENT ON COLUMN user_profiles.vehicles IS 'Array of vehicle objects with year, make, model, VIN, mileage, license plate';
COMMENT ON COLUMN user_profiles.onboarding_data IS 'JSON object containing onboarding form data';

-- Step 10: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 11: Verify the migration
DO $$
BEGIN
    -- Check that RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on user_profiles table';
    END IF;

    -- Check that policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        RAISE EXCEPTION 'Insert policy not found on user_profiles table';
    END IF;

    RAISE NOTICE 'Migration completed successfully! RLS policies are properly configured for user_profiles table.';
END $$; 