-- 🔧 COMPLETE BACKFILL FOR REMAINING USERS
-- Run this in your Supabase SQL Editor

-- 1. Show the 13 users without profiles
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
    AND up.id IS NULL
ORDER BY u.created_at DESC;

-- 2. Create profiles for the remaining users
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

-- 3. Verify all users now have profiles
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
LIMIT 20;

-- 4. Final count verification
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

-- ✅ DONE! All users should now have profiles. 