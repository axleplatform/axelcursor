-- 🔧 CREATE MISSING PROFILES
-- Run this in your Supabase SQL Editor

-- 1. Show users without profiles
SELECT 'Users without profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'BOTH'
        WHEN u.email IS NOT NULL THEN 'EMAIL ONLY'
        WHEN u.phone IS NOT NULL THEN 'PHONE ONLY'
        ELSE 'NO CONTACT'
    END as contact_type
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) 
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Count how many profiles we need to create
SELECT 'Count of missing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) 
    AND up.id IS NULL;

-- 3. Create profiles for users without them
INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    phone,
    email,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    CASE 
        WHEN u.email IS NOT NULL THEN 
            COALESCE(
                SPLIT_PART(u.email, '@', 1),
                'User'
            )
        ELSE 'User'
    END as first_name,
    '' as last_name,
    u.phone,
    u.email,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) 
    AND up.id IS NULL;

-- 4. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'public.users total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'public.users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'public.users without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) AND up.id IS NULL;

-- 5. Show recently created profiles
SELECT 'Recently created profiles:' as info;
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.email,
    up.phone,
    up.created_at,
    u.created_at as user_created_at
FROM user_profiles up
INNER JOIN users u ON up.user_id = u.id
WHERE up.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY up.created_at DESC
LIMIT 10;

-- 6. Show phone-only users with their new profiles
SELECT 'Phone-only users with profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.first_name,
    up.last_name,
    up.created_at as profile_created_at,
    u.created_at as user_created_at
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY up.created_at DESC
LIMIT 10;

-- 7. Final summary
SELECT 'Final summary:' as info;
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'Users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'Email-only users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL
UNION ALL
SELECT 
    'Phone-only users' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Users with both' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL;

-- ✅ DONE! All users should now have profiles.
