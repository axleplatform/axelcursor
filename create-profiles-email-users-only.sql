-- 🔧 CREATE PROFILES FOR EMAIL USERS ONLY (LEAVE PHONE USERS AS GUESTS)
-- Run this in your Supabase SQL Editor

-- 1. Show current situation
SELECT 'Current situation:' as info;
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'Email users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'Phone-only users (guests)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Users with both' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL;

-- 2. Show email users without profiles
SELECT 'Email users without profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'BOTH'
        WHEN u.email IS NOT NULL THEN 'EMAIL ONLY'
        ELSE 'OTHER'
    END as contact_type
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL  -- Only email users
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Count email users needing profiles
SELECT 'Count of email users needing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL  -- Only email users
    AND up.id IS NULL;

-- 4. Create profiles for email users only
INSERT INTO user_profiles (
    id,
    user_id,
    email,
    phone,
    full_name,
    onboarding_completed,
    onboarding_type,
    notifications_enabled,
    subscription_status,
    subscription_plan,
    vehicles,
    onboarding_data,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    u.id as user_id,
    u.email,
    u.phone,
    CASE 
        WHEN u.email IS NOT NULL THEN 
            COALESCE(
                SPLIT_PART(u.email, '@', 1),
                'User'
            )
        ELSE 'User'
    END as full_name,
    false as onboarding_completed,
    'standard' as onboarding_type,
    true as notifications_enabled,
    'free' as subscription_status,
    'basic' as subscription_plan,
    '[]'::jsonb as vehicles,
    '{}'::jsonb as onboarding_data,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL  -- Only email users
    AND up.id IS NULL;

-- 5. Show phone-only users (these stay as guests)
SELECT 'Phone-only users (guests for onboarding):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'GUEST - NO PROFILE NEEDED' as status,
    'Will go through customer onboarding' as explanation
FROM users u
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'Email users total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'Email users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
UNION ALL
SELECT 
    'Email users without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND up.id IS NULL
UNION ALL
SELECT 
    'Phone-only users (guests)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL;

-- 7. Show recently created profiles
SELECT 'Recently created profiles (email users only):' as info;
SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.email,
    up.phone,
    up.onboarding_completed,
    up.onboarding_type,
    up.created_at,
    u.created_at as user_created_at
FROM user_profiles up
INNER JOIN users u ON up.user_id = u.id
WHERE up.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY up.created_at DESC
LIMIT 10;

-- 8. Show all users with profiles (should only be email users)
SELECT 'All users with profiles (email users only):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'EMAIL + PHONE'
        WHEN u.email IS NOT NULL THEN 'EMAIL ONLY'
        ELSE 'OTHER'
    END as contact_type
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL  -- Should only be email users
ORDER BY up.created_at DESC
LIMIT 10;

-- 9. Final summary
SELECT 'Final summary:' as info;
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'Email users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
UNION ALL
SELECT 
    'Phone-only users (guests)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Users with both email and phone' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL;

-- 10. Show the intended flow
SELECT 'Intended user flow:' as info;
SELECT 
    'Email users' as user_type,
    'Have profiles, can access dashboard' as flow,
    'Full account functionality' as access
UNION ALL
SELECT 
    'Phone-only users' as user_type,
    'No profiles, go to customer onboarding' as flow,
    'Guest users until account creation' as access;

-- ✅ DONE! Email users have profiles, phone users remain guests for onboarding. 