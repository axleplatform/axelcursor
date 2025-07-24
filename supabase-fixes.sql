-- 🔧 SUPABASE PROFILE CREATION FIXES
-- Run this in your Supabase SQL Editor to fix 406/409 errors

-- 1. Add missing columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS free_trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS last_service TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_type TEXT;

-- 2. Fix RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;

CREATE POLICY "Enable read access for authenticated users" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Fix RLS policies for users table
DROP POLICY IF EXISTS "Users can view own user record" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

CREATE POLICY "Enable read access for authenticated users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 4. Create automatic profile creation trigger
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
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'full_name',
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

-- Create the trigger
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_trigger();

-- 5. Create safe user existence check functions
CREATE OR REPLACE FUNCTION check_user_exists_by_phone(phone_number TEXT)
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email
    FROM auth.users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE up.phone = phone_number
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_exists_by_email(user_email TEXT)
RETURNS TABLE(user_id UUID, phone TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, up.phone
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.email = user_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);

-- 7. Update existing profiles with missing defaults
UPDATE user_profiles 
SET 
    notifications_enabled = COALESCE(notifications_enabled, true),
    subscription_status = COALESCE(subscription_status, 'free'),
    subscription_plan = COALESCE(subscription_plan, 'basic'),
    vehicles = COALESCE(vehicles, '[]'::jsonb),
    onboarding_data = COALESCE(onboarding_data, '{}'::jsonb),
    onboarding_completed = COALESCE(onboarding_completed, false)
WHERE 
    notifications_enabled IS NULL 
    OR subscription_status IS NULL 
    OR subscription_plan IS NULL 
    OR vehicles IS NULL 
    OR onboarding_data IS NULL 
    OR onboarding_completed IS NULL;

-- 8. Backfill missing user profiles
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
)
SELECT 
    gen_random_uuid(),
    u.id,
    u.email,
    u.raw_user_meta_data->>'phone',
    u.raw_user_meta_data->>'full_name',
    false,
    'standard',
    true,
    'free',
    'basic',
    '[]'::jsonb,
    '{}'::jsonb,
    u.created_at,
    u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
);

-- 9. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists_by_email(TEXT) TO authenticated;

-- 10. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ✅ DONE! Your profile creation should now work without errors. 