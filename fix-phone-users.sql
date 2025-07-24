-- 🔧 FIX PHONE-ONLY USERS
-- Run this in your Supabase SQL Editor

-- 1. Show current situation with phone users
SELECT 'Current situation (including phone users):' as info;
SELECT 
    'auth.users with email' as table_name,
    COUNT(*) as total_count
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'auth.users with phone' as table_name,
    COUNT(*) as total_count
FROM auth.users
WHERE phone IS NOT NULL
UNION ALL
SELECT 
    'public.users with email' as table_name,
    COUNT(*) as total_count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'public.users with phone' as table_name,
    COUNT(*) as total_count
FROM users
WHERE phone IS NOT NULL
UNION ALL
SELECT 
    'user_profiles total' as table_name,
    COUNT(*) as total_count
FROM user_profiles;

-- 2. Show auth.users that are missing from public.users (both email and phone)
SELECT 'Users missing from public.users:' as info;
SELECT 
    au.id,
    au.email,
    au.phone,
    au.created_at,
    CASE 
        WHEN au.email IS NOT NULL AND au.phone IS NOT NULL THEN 'BOTH'
        WHEN au.email IS NOT NULL THEN 'EMAIL ONLY'
        WHEN au.phone IS NOT NULL THEN 'PHONE ONLY'
        ELSE 'NO CONTACT'
    END as contact_type
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
    AND (au.email IS NOT NULL OR au.phone IS NOT NULL)
ORDER BY au.created_at DESC
LIMIT 10;

-- 3. Add ALL missing users to public.users (email OR phone)
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
    AND (au.email IS NOT NULL OR au.phone IS NOT NULL);

-- 4. Update public.users with data from auth.users (both email and phone)
UPDATE users 
SET 
    email = COALESCE(auth_users.email, users.email),
    phone = COALESCE(auth_users.phone, users.phone),
    updated_at = NOW()
FROM auth.users auth_users
WHERE users.id = auth_users.id
    AND (
        (users.email IS NULL AND auth_users.email IS NOT NULL)
        OR (users.phone IS NULL AND auth_users.phone IS NOT NULL)
        OR (users.email != auth_users.email)
        OR (users.phone != auth_users.phone)
    );

-- 5. Show final counts
SELECT 'Final counts:' as info;
SELECT 
    'auth.users with email' as table_name,
    COUNT(*) as total_count
FROM auth.users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'auth.users with phone' as table_name,
    COUNT(*) as total_count
FROM auth.users
WHERE phone IS NOT NULL
UNION ALL
SELECT 
    'public.users with email' as table_name,
    COUNT(*) as total_count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'public.users with phone' as table_name,
    COUNT(*) as total_count
FROM users
WHERE phone IS NOT NULL
UNION ALL
SELECT 
    'user_profiles total' as table_name,
    COUNT(*) as total_count
FROM user_profiles;

-- 6. Show users with profiles (including phone-only users)
SELECT 'Users with profiles (including phone users):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    CASE 
        WHEN up.id IS NULL THEN 'NO PROFILE'
        ELSE 'HAS PROFILE'
    END as profile_status,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'BOTH'
        WHEN u.email IS NOT NULL THEN 'EMAIL ONLY'
        WHEN u.phone IS NOT NULL THEN 'PHONE ONLY'
        ELSE 'NO CONTACT'
    END as contact_type
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Final verification (including phone users)
SELECT 'Final verification (including phone users):' as info;
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

-- 8. Show users that still need profiles (including phone users)
SELECT 'Users still needing profiles (including phone users):' as info;
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

-- 9. Show phone-only users specifically
SELECT 'Phone-only users:' as info;
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
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- ✅ DONE! Now includes phone-only users properly.
