-- 🔧 FIX FOR ONBOARDING_TYPE CONSTRAINT ERROR
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what the current constraint allows
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- 2. Drop the problematic constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_onboarding_type_check;

-- 3. Create a new constraint that allows all valid onboarding types
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_onboarding_type_check 
CHECK (onboarding_type IN ('standard', 'post_appointment', 'full', 'mechanic', 'guest'));

-- 4. Update the trigger function to use valid onboarding types
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

-- 5. Update any existing records with invalid onboarding_type values
UPDATE user_profiles 
SET onboarding_type = 'standard' 
WHERE onboarding_type NOT IN ('standard', 'post_appointment', 'full', 'mechanic', 'guest')
   OR onboarding_type IS NULL;

-- 6. Show the updated constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- 7. Test the trigger by showing current state
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

-- ✅ DONE! The constraint error should now be fixed. 