-- 🔧 FIX USER CREATION TRIGGER
-- Run this in your Supabase SQL Editor

-- 1. Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'create_user_profile_trigger';

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

-- 3. Drop existing function if it exists
DROP FUNCTION IF EXISTS create_user_profile_trigger();

-- 4. Create the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile for new users (not updates)
    IF TG_OP = 'INSERT' THEN
        -- Check if user already has a profile
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id) THEN
            -- Insert into user_profiles
            INSERT INTO public.user_profiles (
                user_id,
                email,
                onboarding_completed,
                onboarding_type,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                false,
                'standard',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created user profile for user % with email %', NEW.id, NEW.email;
        ELSE
            RAISE NOTICE 'User profile already exists for user %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_trigger();

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_profile_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_trigger() TO service_role;

-- 7. Test the trigger by checking if it exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'create_user_profile_trigger';

-- 8. Check current users and profiles
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as count
FROM user_profiles;

-- 9. Show users without profiles
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN up.id IS NULL THEN 'NO PROFILE'
        ELSE 'HAS PROFILE'
    END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- ✅ DONE! Trigger should now work properly.
