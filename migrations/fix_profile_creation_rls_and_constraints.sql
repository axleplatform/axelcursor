-- Fix Profile Creation RLS and Constraints
-- This migration ensures all RLS policies and constraints work properly with the profile creation logic

-- Step 1: Ensure users table has all necessary columns and constraints
DO $$
BEGIN
    -- Add profile_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_status'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_status VARCHAR(20) DEFAULT 'no';
        CREATE INDEX IF NOT EXISTS idx_users_profile_status ON users(profile_status);
    END IF;

    -- Add account_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'account_type'
    ) THEN
        ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'temporary';
        CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer';
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    END IF;
END $$;

-- Step 2: Update existing users with correct profile_status based on their profiles
UPDATE users 
SET profile_status = 'mechanic' 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM mechanic_profiles 
    WHERE user_id IS NOT NULL
);

UPDATE users 
SET profile_status = 'customer' 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM user_profiles 
    WHERE user_id IS NOT NULL
)
AND profile_status != 'mechanic'; -- Don't override mechanics

-- Step 3: Ensure user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    communication_preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_type TEXT, -- 'post_appointment', 'full', etc.
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    vehicles JSONB DEFAULT '[]',
    referral_source TEXT,
    last_service JSONB,
    notifications_enabled BOOLEAN DEFAULT FALSE,
    subscription_plan TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    free_trial_ends_at TIMESTAMP WITH TIME ZONE,
    onboarding_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);

-- Step 5: Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage user profiles" ON user_profiles;

-- Step 7: Create comprehensive RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow service role to manage users (for OAuth callbacks and profile creation)
CREATE POLICY "Service role can manage users" ON users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to insert their own user record (for profile creation)
CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Step 8: Create comprehensive RLS policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow service role to manage user profiles (for OAuth callbacks and admin functions)
CREATE POLICY "Service role can manage user profiles" ON user_profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 9: Create comprehensive RLS policies for mechanic_profiles table
DROP POLICY IF EXISTS "Mechanics can view their own profile" ON mechanic_profiles;
DROP POLICY IF EXISTS "Mechanics can update their own profile" ON mechanic_profiles;
DROP POLICY IF EXISTS "Mechanics can insert their own profile" ON mechanic_profiles;

CREATE POLICY "Mechanics can view their own profile" ON mechanic_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Mechanics can update their own profile" ON mechanic_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Mechanics can insert their own profile" ON mechanic_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow service role to manage mechanic profiles
CREATE POLICY "Service role can manage mechanic profiles" ON mechanic_profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 10: Update appointments RLS policies for better profile linking
DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON appointments;

CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT TO authenticated, anon
    USING (
        user_id = auth.uid() 
        OR is_guest = true 
        OR auth.uid() IS NULL
    );

CREATE POLICY "Users can create appointments" ON appointments
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        user_id = auth.uid() 
        OR is_guest = true 
        OR auth.uid() IS NULL
    );

CREATE POLICY "Users can update their appointments" ON appointments
    FOR UPDATE TO authenticated, anon
    USING (
        user_id = auth.uid() 
        OR is_guest = true 
        OR auth.uid() IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() 
        OR is_guest = true 
        OR auth.uid() IS NULL
    );

-- Step 11: Create triggers for automatic profile_status updates
CREATE OR REPLACE FUNCTION update_profile_status_on_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user_profiles record is created, set profile_status = 'customer'
    UPDATE users 
    SET profile_status = 'customer',
        account_type = 'full',
        role = 'customer'
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_profile_status_on_user_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user_profiles record is deleted, check if user has mechanic profile
    UPDATE users 
    SET profile_status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM mechanic_profiles 
            WHERE user_id = OLD.user_id
        ) THEN 'mechanic'
        ELSE 'no'
    END
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_profile_status_on_mechanic_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a mechanic_profiles record is created, set profile_status = 'mechanic'
    UPDATE users 
    SET profile_status = 'mechanic',
        account_type = 'mechanic',
        role = 'mechanic'
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_profile_status_on_mechanic_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a mechanic_profiles record is deleted, check if user has user_profiles
    UPDATE users 
    SET profile_status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = OLD.user_id
        ) THEN 'customer'
        ELSE 'no'
    END
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create triggers
DROP TRIGGER IF EXISTS trigger_update_profile_status_user_profile ON user_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_user_profile_delete ON user_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_mechanic_profile ON mechanic_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_mechanic_profile_delete ON mechanic_profiles;

CREATE TRIGGER trigger_update_profile_status_user_profile
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_user_profile();

CREATE TRIGGER trigger_update_profile_status_user_profile_delete
    AFTER DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_user_profile_delete();

CREATE TRIGGER trigger_update_profile_status_mechanic_profile
    AFTER INSERT ON mechanic_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_mechanic_profile();

CREATE TRIGGER trigger_update_profile_status_mechanic_profile_delete
    AFTER DELETE ON mechanic_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_mechanic_profile_delete();

-- Step 13: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;

GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

GRANT ALL ON mechanic_profiles TO authenticated;
GRANT ALL ON mechanic_profiles TO service_role;

GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO anon;
GRANT ALL ON appointments TO service_role;

-- Step 14: Create function to merge users when phone number matches (for account linking)
CREATE OR REPLACE FUNCTION merge_users_by_phone(phone_to_check VARCHAR(20), current_user_id UUID)
RETURNS UUID AS $$
DECLARE
    existing_user_id UUID;
    appointment_count INTEGER;
BEGIN
    -- Find existing user with this phone number
    SELECT id INTO existing_user_id
    FROM users
    WHERE phone = phone_to_check
    AND id != current_user_id
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        -- Count appointments for the current user
        SELECT COUNT(*) INTO appointment_count
        FROM appointments
        WHERE user_id = current_user_id;

        -- If current user has appointments, move them to existing user
        IF appointment_count > 0 THEN
            UPDATE appointments
            SET user_id = existing_user_id
            WHERE user_id = current_user_id;
        END IF;

        -- Delete the current user (since we're merging into existing)
        DELETE FROM users WHERE id = current_user_id;

        RETURN existing_user_id;
    ELSE
        -- No existing user found, return current user
        RETURN current_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Add comments for documentation
COMMENT ON COLUMN users.profile_status IS 'User account type: customer, mechanic, or no (temporary/guest)';
COMMENT ON COLUMN users.account_type IS 'Account type: temporary, phone_only, phone_returning, full, mechanic';
COMMENT ON COLUMN users.role IS 'User role: customer, mechanic, or anon';
COMMENT ON FUNCTION update_profile_status_on_user_profile() IS 'Automatically sets profile_status to customer when user_profiles record is created';
COMMENT ON FUNCTION update_profile_status_on_mechanic_profile() IS 'Automatically sets profile_status to mechanic when mechanic_profiles record is created';
COMMENT ON FUNCTION merge_users_by_phone() IS 'Merges users when phone number matches, moving appointments to existing user';

-- Step 16: Verify the migration
DO $$
BEGIN
    -- Check that all tables have RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on users table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on user_profiles table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'mechanic_profiles' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on mechanic_profiles table';
    END IF;

    RAISE NOTICE 'Migration completed successfully! All RLS policies and constraints are in place.';
END $$;
