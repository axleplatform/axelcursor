-- 🔧 CLEANUP DUPLICATE USERS IN PUBLIC.USERS
-- Run this in your Supabase SQL Editor

-- 1. Show duplicate users
SELECT 'Duplicate users in public.users:' as info;
SELECT 
    id,
    COUNT(*) as count
FROM users
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Show total counts before cleanup
SELECT 'Before cleanup:' as info;
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

-- 3. Create a temporary table with unique users (keeping the most recent)
CREATE TEMP TABLE unique_users AS
SELECT DISTINCT ON (id) 
    id,
    email,
    phone,
    created_at,
    updated_at
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
ORDER BY id, created_at DESC;

-- 4. Delete all users from public.users
DELETE FROM users;

-- 5. Re-insert only unique users
INSERT INTO users (id, email, phone, created_at, updated_at)
SELECT id, email, phone, created_at, updated_at
FROM unique_users;

-- 6. Show final counts after cleanup
SELECT 'After cleanup:' as info;
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

-- 7. Show users with profiles after cleanup
SELECT 'Users with profiles (after cleanup):' as info;
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

-- 9. Clean up temporary table
DROP TABLE unique_users;

-- ✅ DONE! Duplicate users should now be cleaned up.
