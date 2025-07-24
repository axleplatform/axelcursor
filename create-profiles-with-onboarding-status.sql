-- 🔧 CREATE PROFILES WITH PROPER ONBOARDING STATUS
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
    'Post-appointment (phone only)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Incomplete (email only)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 2. Show users with both email and phone who need profiles
SELECT 'Users with both email and phone (need profiles):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'HAS BOTH - NEEDS PROFILE' as status,
    'May have incomplete onboarding' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Count users needing profiles
SELECT 'Count of users needing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL;

-- 4. Create profiles for users with both email and phone (onboarding status unknown)
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
    false as onboarding_completed,  -- Default to false - they may have left mid-onboarding
    'post_appointment' as onboarding_type,  -- Likely from post-appointment flow
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

-- 5. Show post-appointment users (phone only, need email)
SELECT 'Post-appointment users (need email):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'POST-APPOINTMENT - NEEDS EMAIL' as status,
    'Phone from appointment, waiting for email input' as explanation
FROM users u
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show incomplete users (no profiles needed)
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
    'Cannot have profile without both email and phone' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NULL OR u.phone IS NULL)  -- Incomplete users
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'Users with both email and phone total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL
UNION ALL
SELECT 
    'Users with both email and phone with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
UNION ALL
SELECT 
    'Users with both email and phone without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL AND up.id IS NULL
UNION ALL
SELECT 
    'Post-appointment users (phone only)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Incomplete users (email only)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 8. Show recently created profiles
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

-- 9. Show all users with profiles and their onboarding status
SELECT 'All users with profiles (check onboarding status):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    CASE 
        WHEN up.onboarding_completed = true THEN 'ONBOARDING COMPLETE'
        WHEN up.onboarding_completed = false THEN 'ONBOARDING INCOMPLETE'
        ELSE 'UNKNOWN'
    END as onboarding_status
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
ORDER BY up.created_at DESC
LIMIT 10;

-- 10. Final summary
SELECT 'Final summary:' as info;
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
    'Users with profiles (onboarding status varies)' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
UNION ALL
SELECT 
    'Post-appointment users (phone only)' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Incomplete users (email only)' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 11. Show the user flow
SELECT 'User flow:' as info;
SELECT 
    'Users with both email and phone' as user_type,
    'Have profiles (onboarding_completed may be false)' as profile_status,
    'Can access dashboard, may need to complete onboarding' as access
UNION ALL
SELECT 
    'Post-appointment users (phone only)' as user_type,
    'No profiles, need email input' as profile_status,
    'Go to onboarding to add email' as access
UNION ALL
SELECT 
    'Incomplete users (email only)' as user_type,
    'No profiles, need phone input' as profile_status,
    'Go to onboarding to add phone' as access;

-- 12. Show onboarding completion check
SELECT 'Onboarding completion check:' as info;
SELECT 
    'Check onboarding_completed field' as instruction,
    'true = can access full dashboard' as true_meaning,
    'false = must complete onboarding first' as false_meaning;

-- ✅ DONE! Users with both email and phone get profiles, onboarding status determines dashboard access.
