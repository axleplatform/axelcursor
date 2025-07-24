-- 🔍 DIAGNOSE USER PROFILE ISSUES
-- Run this in your Supabase SQL Editor

-- 1. Check total counts in each table
SELECT 'Table counts:' as info;
SELECT 
    'auth.users' as table_name,
    COUNT(*) as total_count
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as total_count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as total_count
FROM user_profiles;

-- 2. Show sample users from each table
SELECT 'Sample auth.users:' as info;
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Sample public.users:' as info;
SELECT 
    id,
    email,
    phone,
    created_at
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Sample user_profiles:' as info;
SELECT 
    id,
    user_id,
    email,
    phone_number,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check for users without profiles (using auth.users)
SELECT 'Users without profiles (auth.users):' as info;
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

-- 4. Check for users without profiles (using public.users)
SELECT 'Users without profiles (public.users):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    CASE 
        WHEN up.id IS NULL THEN 'NO PROFILE'
        ELSE 'HAS PROFILE'
    END as profile_status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Check for orphaned profiles (profiles without users)
SELECT 'Orphaned profiles:' as info;
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.created_at,
    CASE 
        WHEN u.id IS NULL THEN 'NO USER'
        ELSE 'HAS USER'
    END as user_status
FROM user_profiles up
LEFT JOIN users u ON up.user_id = u.id
ORDER BY up.created_at DESC
LIMIT 10;

-- 6. Check for duplicate user IDs
SELECT 'Duplicate user IDs in user_profiles:' as info;
SELECT 
    user_id,
    COUNT(*) as count
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 7. Show the actual join issue
SELECT 'Join test:' as info;
SELECT 
    'auth.users total' as metric,
    COUNT(*) as count
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'public.users total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'user_profiles total' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'auth.users with profiles' as metric,
    COUNT(*) as count
FROM auth.users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
UNION ALL
SELECT 
    'public.users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL;

-- ✅ DIAGNOSIS COMPLETE! Check the results above.
