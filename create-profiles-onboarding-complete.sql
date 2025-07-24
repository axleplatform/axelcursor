-- 🔧 CREATE PROFILES FOR ONBOARDING-COMPLETE USERS (EMAIL + PHONE)
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
    'Onboarding complete (email + phone)' as metric,
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
    'Incomplete onboarding' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 2. Show onboarding-complete users without profiles
SELECT 'Onboarding-complete users without profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'ONBOARDING COMPLETE - NEEDS PROFILE' as status,
    'Has both email and phone from onboarding' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both from onboarding
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Count onboarding-complete users needing profiles
SELECT 'Count of onboarding-complete users needing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both from onboarding
    AND up.id IS NULL;

-- 4. Create profiles for onboarding-complete users only
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
    true as onboarding_completed,  -- Mark as completed since they have both
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
    AND u.phone IS NOT NULL  -- Both from onboarding
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

-- 6. Show incomplete onboarding users
SELECT 'Incomplete onboarding users:' as info;
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
    'Incomplete onboarding process' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NULL OR u.phone IS NULL)  -- Incomplete users
    AND up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'Onboarding complete total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL
UNION ALL
SELECT 
    'Onboarding complete with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
UNION ALL
SELECT 
    'Onboarding complete without profiles' as metric,
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
    'Incomplete onboarding' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 8. Show recently created profiles
SELECT 'Recently created profiles (onboarding complete):' as info;
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

-- 9. Show all users with profiles (should only be onboarding complete)
SELECT 'All users with profiles (onboarding complete only):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    'ONBOARDING COMPLETE' as status
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL  -- Should only be onboarding complete
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
    'Onboarding complete with profiles' as metric,
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
    'Incomplete onboarding' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NULL;

-- 11. Show the onboarding flow
SELECT 'Onboarding flow:' as info;
SELECT 
    'Post-appointment onboarding' as step,
    'Get phone from appointment, then ask for email' as description,
    'Creates user with both email and phone' as result
UNION ALL
SELECT 
    'Customer onboarding' as step,
    'Ask for both email and phone' as description,
    'Creates user with both email and phone' as result
UNION ALL
SELECT 
    'User profile creation' as step,
    'Only for users with both email and phone' as description,
    'Enables customer dashboard access' as result;

-- ✅ DONE! Only onboarding-complete users (email + phone) have profiles for dashboard access. 