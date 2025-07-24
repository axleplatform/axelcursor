-- 🔧 BACKFILL MISSING USER PROFILES (FIXED)
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. Show users without profiles
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
ORDER BY u.created_at DESC;

-- 3. Create missing profiles with explicit ID (using user_id as ID)
INSERT INTO user_profiles (
    id,
    user_id,
    email,
    onboarding_completed,
    onboarding_type,
    created_at,
    updated_at
)
SELECT 
    u.id,  -- Use user_id as the profile ID
    u.id,
    u.email,
    false,
    'standard',
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND up.id IS NULL
    AND u.id NOT IN (
        SELECT user_id FROM mechanic_profiles
    );

-- 4. Show the results after backfill
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
ORDER BY u.created_at DESC;

-- 5. Show counts
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'Users with profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Users without profiles' as metric,
    COUNT(*) as count
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND up.id IS NULL;

-- ✅ DONE! All existing users should now have profiles.
