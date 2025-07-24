-- 🔧 DIRECT FIX FOR USER PROFILES ISSUE
-- Run this in your Supabase SQL Editor

-- 1. Ensure user_profiles table exists with all columns
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
    onboarding_type TEXT,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    vehicles JSONB DEFAULT '[]',
    referral_source TEXT,
    last_service JSONB,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    subscription_plan TEXT DEFAULT 'basic',
    subscription_status TEXT DEFAULT 'free',
    free_trial_ends_at TIMESTAMP WITH TIME ZONE,
    onboarding_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns if they don't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS free_trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_service JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_type TEXT;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);

-- 4. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;

-- 6. Create new RLS policies
CREATE POLICY "Enable read access for authenticated users" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Create automatic profile creation trigger
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
        
        RAISE NOTICE 'Created user profile for user %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

-- 9. Create the trigger
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_trigger();

-- 10. Backfill existing users who don't have profiles
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

-- 11. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_trigger() TO service_role;

-- 12. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 13. Show results
SELECT 
    'Total auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Users without profiles' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
);

-- ✅ DONE! User profiles should now be created automatically for new users.
