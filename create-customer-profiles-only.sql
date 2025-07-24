-- 🔧 CREATE CUSTOMER PROFILES ONLY (EXCLUDE MECHANICS)
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
    'Customers with both email and phone' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL  -- Not a mechanic
UNION ALL
SELECT 
    'Mechanics (excluded from user_profiles)' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'Post-appointment customers (phone only)' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
    AND mp.user_id IS NULL;  -- Not a mechanic

-- 2. Show customers with both email and phone who need profiles
SELECT 'Customers with both email and phone (need profiles):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'CUSTOMER - NEEDS PROFILE' as status,
    'Has both email and phone, not a mechanic' as explanation
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL  -- No profile yet
    AND mp.user_id IS NULL  -- Not a mechanic
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Count customers needing profiles
SELECT 'Count of customers needing profiles:' as info;
SELECT COUNT(*) as missing_profiles_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL  -- No profile yet
    AND mp.user_id IS NULL;  -- Not a mechanic

-- 4. Create profiles for customers only (exclude mechanics)
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
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL 
    AND u.phone IS NOT NULL  -- Both email and phone
    AND up.id IS NULL  -- No profile yet
    AND mp.user_id IS NULL;  -- Not a mechanic

-- 5. Show mechanics (excluded from user_profiles)
SELECT 'Mechanics (excluded from user_profiles):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    mp.name as mechanic_name,
    u.created_at,
    'MECHANIC - HAS MECHANIC_PROFILE' as status,
    'Uses mechanic_profiles table, not user_profiles' as explanation
FROM users u
INNER JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Show post-appointment customers (phone only, need email)
SELECT 'Post-appointment customers (need email):' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    'POST-APPOINTMENT CUSTOMER - NEEDS EMAIL' as status,
    'Phone from appointment, waiting for email input' as explanation
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
    AND mp.user_id IS NULL  -- Not a mechanic
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Show incomplete customers (no profiles needed)
SELECT 'Incomplete customers (no profiles needed):' as info;
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
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE (u.email IS NULL OR u.phone IS NULL)  -- Incomplete users
    AND up.id IS NULL  -- No profile yet
    AND mp.user_id IS NULL  -- Not a mechanic
ORDER BY u.created_at DESC
LIMIT 10;

-- 8. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'Customers with both email and phone total' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL
UNION ALL
SELECT 
    'Customers with both email and phone with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL
UNION ALL
SELECT 
    'Customers with both email and phone without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL 
    AND up.id IS NULL
    AND mp.user_id IS NULL
UNION ALL
SELECT 
    'Mechanics total' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'Post-appointment customers (phone only)' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
    AND mp.user_id IS NULL;

-- 9. Show recently created customer profiles
SELECT 'Recently created customer profiles:' as info;
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
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE up.created_at >= NOW() - INTERVAL '1 hour'
    AND mp.user_id IS NULL  -- Ensure it's a customer
ORDER BY up.created_at DESC
LIMIT 10;

-- 10. Show all customer profiles and their onboarding status
SELECT 'All customer profiles (check onboarding status):' as info;
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
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL  -- Ensure it's a customer
ORDER BY up.created_at DESC
LIMIT 10;

-- 11. Final summary
SELECT 'Final summary:' as info;
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'Customers with both email and phone' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL
UNION ALL
SELECT 
    'Customer profiles created' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL AND u.phone IS NOT NULL
    AND mp.user_id IS NULL
UNION ALL
SELECT 
    'Mechanics (excluded)' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'Post-appointment customers (phone only)' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
    AND mp.user_id IS NULL;

-- 12. Show the separation
SELECT 'Table separation:' as info;
SELECT 
    'user_profiles' as table_name,
    'For customers only' as purpose,
    'Contains customer profile data' as description
UNION ALL
SELECT 
    'mechanic_profiles' as table_name,
    'For mechanics only' as purpose,
    'Contains mechanic profile data' as description;

-- ✅ DONE! Only customers get user_profiles, mechanics use mechanic_profiles. 