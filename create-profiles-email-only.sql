-- 🔧 CREATE PROFILES FOR EMAIL USERS ONLY
-- Run this in your Supabase SQL Editor

-- 1. Show users without profiles (email users only)
SELECT 'Users without profiles (email users only):' as info;
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
WHERE u.email IS NOT NULL  -- Only email users
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Count how many email profiles we need to create
SELECT 'Count of missing email profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL  -- Only email users
    AND up.id IS NULL;

-- 3. Create profiles for email users only (since email is NOT NULL)
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

-- 4. Show final verification for email users
SELECT 'Final verification (email users):' as info;
SELECT 
    'public.users with email' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'public.users with email and profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
UNION ALL
SELECT 
    'public.users with email but no profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND up.id IS NULL;

-- 5. Show phone-only users (these can't have profiles due to email constraint)
SELECT 'Phone-only users (cannot have profiles due to email constraint):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'PHONE ONLY - NO PROFILE POSSIBLE' as status
FROM users u
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show recently created profiles
SELECT 'Recently created profiles:' as info;
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

-- 7. Final summary
SELECT 'Final summary:' as info;
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
    'Email users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL
UNION ALL
SELECT 
    'Phone-only users' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Users with both email and phone' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL;

-- 8. Show the constraint issue
SELECT 'Database constraint issue:' as info;
SELECT 
    'user_profiles.email has NOT NULL constraint' as issue,
    'Phone-only users cannot have profiles' as explanation,
    'Consider modifying schema to allow NULL email' as suggestion;

-- ✅ DONE! Email users now have profiles. Phone-only users cannot have profiles due to email constraint.
