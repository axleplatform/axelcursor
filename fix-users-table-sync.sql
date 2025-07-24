-- 🔧 FIX DATA INCONSISTENCY BETWEEN PUBLIC TABLES
-- Run this in your Supabase SQL Editor

-- 1. Check the structure of both tables
SELECT 'public.users columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'public.user_profiles columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show recent users and their data
SELECT 
    'Recent public.users' as source,
    u.id,
    u.email,
    u.phone,
    u.created_at
FROM users u
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 5;

SELECT 
    'Recent user_profiles' as source,
    up.id,
    up.user_id,
    up.email,
    up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 5;

-- 3. Show data mismatch for recent users
SELECT 
    u.id,
    u.email as users_email,
    up.email as profile_email,
    u.phone as users_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        ELSE 'OK'
    END as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Update user_profiles to sync with users table
UPDATE user_profiles 
SET 
    email = users_table.email,
    updated_at = NOW()
FROM users users_table
WHERE user_profiles.user_id = users_table.id
    AND user_profiles.email != users_table.email;

-- 5. Update users table to sync with user_profiles (for missing data)
UPDATE users 
SET 
    email = user_profiles.email,
    updated_at = NOW()
FROM user_profiles
WHERE users.id = user_profiles.user_id
    AND users.email IS NULL 
    AND user_profiles.email IS NOT NULL;

-- 6. Show final comparison
SELECT 
    u.id,
    u.email as users_email,
    up.email as profile_email,
    u.phone as users_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        ELSE 'SYNCED'
    END as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Check if there are any users without profiles
SELECT 
    'Users without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND up.id IS NULL;

-- ✅ DONE! Data should now be consistent between public tables. 