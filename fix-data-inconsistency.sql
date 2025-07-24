-- 🔧 FIX DATA INCONSISTENCY BETWEEN TABLES
-- Run this in your Supabase SQL Editor

-- 1. Check the structure of both tables
SELECT 'auth.users columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'auth'
ORDER BY ordinal_position;

SELECT 'user_profiles columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show recent users and their data
SELECT 
    'Recent auth.users' as source,
    u.id,
    u.email,
    u.phone,
    u.created_at
FROM auth.users u
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 5;

SELECT 
    'Recent user_profiles' as source,
    up.id,
    up.user_id,
    up.email,
    up.phone_number,
    up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 5;

-- 3. Show data mismatch for recent users
SELECT 
    u.id,
    u.email as auth_email,
    up.email as profile_email,
    u.phone as auth_phone,
    up.phone_number as profile_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        WHEN u.phone != up.phone_number THEN 'PHONE MISMATCH'
        ELSE 'OK'
    END as status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Update user_profiles to sync with auth.users
UPDATE user_profiles 
SET 
    email = auth_users.email,
    phone_number = auth_users.phone,
    updated_at = NOW()
FROM auth.users auth_users
WHERE user_profiles.user_id = auth_users.id
    AND (
        user_profiles.email != auth_users.email 
        OR user_profiles.phone_number != auth_users.phone
    );

-- 5. Update auth.users to sync with user_profiles (for missing data)
UPDATE auth.users 
SET 
    email = user_profiles.email,
    phone = user_profiles.phone_number,
    updated_at = NOW()
FROM user_profiles
WHERE auth.users.id = user_profiles.user_id
    AND (
        auth.users.email IS NULL AND user_profiles.email IS NOT NULL
        OR auth.users.phone IS NULL AND user_profiles.phone_number IS NOT NULL
    );

-- 6. Show final comparison
SELECT 
    u.id,
    u.email as auth_email,
    up.email as profile_email,
    u.phone as auth_phone,
    up.phone_number as profile_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        WHEN u.phone != up.phone_number THEN 'PHONE MISMATCH'
        ELSE 'SYNCED'
    END as status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- ✅ DONE! Data should now be consistent between tables. 