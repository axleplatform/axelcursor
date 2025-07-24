-- 🔧 SIMPLE DATA SYNC (NO DELETES)
-- Run this in your Supabase SQL Editor

-- 1. Show current situation
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

-- 2. Show users that exist in auth.users but not in public.users
SELECT 'Users missing from public.users:' as info;
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

-- 3. Add missing users to public.users (only if they don't exist)
INSERT INTO users (id, email, phone, created_at, updated_at)
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

-- 4. Update public.users with data from auth.users
UPDATE users 
SET 
    email = auth_users.email,
    phone = auth_users.phone,
    updated_at = NOW()
FROM auth.users auth_users
WHERE users.id = auth_users.id
    AND (
        users.email IS NULL AND auth_users.email IS NOT NULL
        OR users.phone IS NULL AND auth_users.phone IS NOT NULL
        OR users.email != auth_users.email
        OR users.phone != auth_users.phone
    );

-- 5. Show final counts
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

-- 6. Show users with profiles
SELECT 'Users with profiles:' as info;
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

-- 7. Final verification
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

-- 8. Show users that still need profiles
SELECT 'Users still needing profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) 
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- ✅ DONE! Data should now be synced without deleting records.
