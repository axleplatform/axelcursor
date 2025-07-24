-- 🔧 CREATE PROFILES FOR COMPLETE CUSTOMERS ONLY (EMAIL + PHONE)
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
    'Users with both email and phone' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL
UNION ALL
SELECT 
    'Email-only users (incomplete)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL
UNION ALL
SELECT 
    'Phone-only users (guests)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL;

-- 2. Show complete customers without profiles
SELECT 'Complete customers without profiles (email + phone):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'COMPLETE CUSTOMER - NEEDS PROFILE' as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Count complete customers needing profiles
SELECT 'Count of complete customers needing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL;

-- 4. Create profiles for complete customers only
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
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL;

-- 5. Show incomplete users (no profiles needed)
SELECT 'Incomplete users (no profiles needed):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NULL THEN 'EMAIL ONLY - NEEDS PHONE'
        WHEN u.phone IS NOT NULL AND u.email IS NULL THEN 'PHONE ONLY - NEEDS EMAIL'
        ELSE 'OTHER'
    END as status,
    'Will complete onboarding to get profile' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NULL OR u.phone IS NULL)  -- Incomplete users
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'Complete customers total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL
UNION ALL
SELECT 
    'Complete customers with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
UNION ALL
SELECT 
    'Complete customers without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL AND up.id IS NULL
UNION ALL
SELECT 
    'Incomplete users (no profiles)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NULL OR phone IS NULL;

-- 7. Show recently created profiles
SELECT 'Recently created profiles (complete customers only):' as info;
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

-- 8. Show all users with profiles (should only be complete customers)
SELECT 'All users with profiles (complete customers only):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    'COMPLETE CUSTOMER' as customer_type
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL  -- Should only be complete customers
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
    'Complete customers with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
UNION ALL
SELECT 
    'Email-only users (incomplete)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL
UNION ALL
SELECT 
    'Phone-only users (guests)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL;

-- 10. Show the intended flow
SELECT 'Intended user flow:' as info;
SELECT 
    'Complete customers (email + phone)' as user_type,
    'Have profiles, can access customer dashboard' as flow,
    'Full customer functionality' as access
UNION ALL
SELECT 
    'Email-only users' as user_type,
    'No profiles, need to add phone in onboarding' as flow,
    'Incomplete - needs phone number' as access
UNION ALL
SELECT 
    'Phone-only users' as user_type,
    'No profiles, need to add email in onboarding' as flow,
    'Guest users - needs email' as access;

-- ✅ DONE! Only complete customers (email + phone) have profiles for dashboard access. 