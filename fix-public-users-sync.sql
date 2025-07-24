-- 🔧 FIX PUBLIC.USERS SYNC WITH AUTH.USERS
-- Run this in your Supabase SQL Editor

-- 1. Show the mismatch
SELECT 'Current situation:' as info;
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

-- 2. Show users in public.users that don't exist in auth.users
SELECT 'Users in public.users but not in auth.users:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
    AND (u.email IS NOT NULL OR u.phone IS NOT NULL)
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Show users in auth.users that don't exist in public.users
SELECT 'Users in auth.users but not in public.users:' as info;
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
    AND au.email IS NOT NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- 4. Sync: Add missing users to public.users from auth.users
INSERT INTO users (
    id,
    email,
    phone,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    au.phone,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
    AND au.email IS NOT NULL;

-- 5. Sync: Update public.users with data from auth.users
UPDATE users 
SET 
    email = auth_users.email,
    phone = auth_users.phone,
    updated_at = NOW()
FROM auth.users auth_users
WHERE users.id = auth_users.id
    AND (
        users.email != auth_users.email
        OR users.phone != auth_users.phone
    );

-- 6. Show final counts
SELECT 'Final counts:' as info;
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

-- 7. Show users with profiles (using public.users)
SELECT 'Users with profiles (public.users):' as info;
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

-- 8. Final verification
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

-- ✅ DONE! Public.users should now be synced with auth.users. 