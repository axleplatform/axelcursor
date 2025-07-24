-- 🔧 CLEANUP: REMOVE MECHANICS FROM USER_PROFILES
-- Run this in your Supabase SQL Editor

-- 1. Show current situation - mechanics in user_profiles
SELECT 'Current situation - mechanics in user_profiles:' as info;
SELECT 
    up.id as profile_id,
    up.user_id,
    up.full_name,
    up.email,
    up.phone,
    up.created_at as profile_created,
    'MECHANIC IN USER_PROFILES - SHOULD BE REMOVED' as status,
    'This mechanic should only be in mechanic_profiles' as explanation
FROM user_profiles up
INNER JOIN mechanic_profiles mp ON up.user_id = mp.user_id
ORDER BY up.created_at DESC;

-- 2. Count mechanics in user_profiles
SELECT 'Count of mechanics in user_profiles:' as info;
SELECT COUNT(*) as mechanics_in_user_profiles
FROM user_profiles up
INNER JOIN mechanic_profiles mp ON up.user_id = mp.user_id;

-- 3. Show what will be deleted (preview)
SELECT 'Preview - mechanics that will be removed from user_profiles:' as info;
SELECT 
    up.id as profile_id,
    up.user_id,
    up.full_name,
    up.email,
    up.phone,
    up.created_at,
    mp.user_id as mechanic_user_id,
    'WILL BE DELETED' as action
FROM user_profiles up
INNER JOIN mechanic_profiles mp ON up.user_id = mp.user_id
ORDER BY up.created_at DESC;

-- 4. DELETE mechanics from user_profiles
DELETE FROM user_profiles 
WHERE user_id IN (
    SELECT DISTINCT mp.user_id 
    FROM mechanic_profiles mp
);

-- 5. Verify cleanup - show remaining user_profiles
SELECT 'After cleanup - remaining user_profiles:' as info;
SELECT 
    up.id as profile_id,
    up.user_id,
    up.full_name,
    up.email,
    up.phone,
    up.onboarding_completed,
    up.created_at,
    CASE 
        WHEN mp.user_id IS NOT NULL THEN 'MECHANIC - SHOULD NOT BE HERE'
        ELSE 'CUSTOMER - CORRECT'
    END as status
FROM user_profiles up
LEFT JOIN mechanic_profiles mp ON up.user_id = mp.user_id
ORDER BY up.created_at DESC
LIMIT 20;

-- 6. Count remaining user_profiles
SELECT 'Count of remaining user_profiles:' as info;
SELECT COUNT(*) as remaining_profiles
FROM user_profiles;

-- 7. Count mechanics in mechanic_profiles
SELECT 'Count of mechanics in mechanic_profiles:' as info;
SELECT COUNT(*) as mechanics_in_mechanic_profiles
FROM mechanic_profiles;

-- 8. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'User profiles total' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Mechanic profiles total' as metric,
    COUNT(*) as count
FROM mechanic_profiles
UNION ALL
SELECT 
    'Mechanics incorrectly in user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles up
INNER JOIN mechanic_profiles mp ON up.user_id = mp.user_id
UNION ALL
SELECT 
    'Customers correctly in user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles up
LEFT JOIN mechanic_profiles mp ON up.user_id = mp.user_id
WHERE mp.user_id IS NULL;

-- 9. Show proper separation
SELECT 'Proper table separation:' as info;
SELECT 
    'user_profiles' as table_name,
    'Customers only' as purpose,
    COUNT(*) as record_count
FROM user_profiles up
LEFT JOIN mechanic_profiles mp ON up.user_id = mp.user_id
WHERE mp.user_id IS NULL
UNION ALL
SELECT 
    'mechanic_profiles' as table_name,
    'Mechanics only' as purpose,
    COUNT(*) as record_count
FROM mechanic_profiles;

-- 10. Show customers who still need profiles
SELECT 'Customers who still need profiles:' as info;
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

-- ✅ DONE! Mechanics removed from user_profiles, proper separation restored.
