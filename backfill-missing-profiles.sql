-- 🔧 BACKFILL MISSING USER PROFILES
-- Run this in your Supabase SQL Editor

-- 1. Show users without profiles
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

-- 2. Create missing profiles for users without them
INSERT INTO user_profiles (
    user_id,
    email,
    onboarding_completed,
    onboarding_type,
    created_at,
    updated_at
)
SELECT 
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

-- 3. Show the results after backfill
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

-- 4. Show counts
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