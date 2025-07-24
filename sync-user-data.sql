-- 🔧 SYNC DATA BETWEEN USERS AND USER_PROFILES
-- Run this in your Supabase SQL Editor

-- 1. Show current data in both tables
SELECT 'Recent users data:' as info;
SELECT 
    id,
    email,
    phone,
    created_at
FROM users 
WHERE email IS NOT NULL OR phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Recent user_profiles data:' as info;
SELECT 
    id,
    user_id,
    email,
    phone_number,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 5;

-- 2. Show data mismatch for recent users
SELECT 
    u.id,
    u.email as users_email,
    up.email as profile_email,
    u.phone as users_phone,
    up.phone_number as profile_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        WHEN u.phone != up.phone_number THEN 'PHONE MISMATCH'
        ELSE 'SYNCED'
    END as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Sync data: Update user_profiles with data from users
UPDATE user_profiles 
SET 
    email = users_table.email,
    phone_number = users_table.phone,
    updated_at = NOW()
FROM users users_table
WHERE user_profiles.user_id = users_table.id
    AND (
        user_profiles.email IS NULL AND users_table.email IS NOT NULL
        OR user_profiles.phone_number IS NULL AND users_table.phone IS NOT NULL
        OR user_profiles.email != users_table.email
        OR user_profiles.phone_number != users_table.phone
    );

-- 4. Sync data: Update users with data from user_profiles
UPDATE users 
SET 
    email = user_profiles.email,
    phone = user_profiles.phone_number,
    updated_at = NOW()
FROM user_profiles
WHERE users.id = user_profiles.user_id
    AND (
        users.email IS NULL AND user_profiles.email IS NOT NULL
        OR users.phone IS NULL AND user_profiles.phone_number IS NOT NULL
        OR users.email != user_profiles.email
        OR users.phone != user_profiles.phone_number
    );

-- 5. Show final comparison
SELECT 
    u.id,
    u.email as users_email,
    up.email as profile_email,
    u.phone as users_phone,
    up.phone_number as profile_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        WHEN u.phone != up.phone_number THEN 'PHONE MISMATCH'
        ELSE 'SYNCED'
    END as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show counts
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'Users with profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Users without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) AND up.id IS NULL;

-- ✅ DONE! Data should now be synced between tables. 