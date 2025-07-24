-- 🔧 FIX EMAIL CONSTRAINT TO ALLOW NULL
-- Run this in your Supabase SQL Editor

-- 1. Show current constraint
SELECT 'Current email constraint:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND column_name = 'email';

-- 2. Show what happens if we try to insert phone-only user
SELECT 'Phone-only users that need profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at
FROM users u
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Modify the email column to allow NULL
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- 4. Verify the change
SELECT 'Email column after modification:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND column_name = 'email';

-- 5. Now create profiles for phone-only users
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
    NULL as email,  -- Now we can use NULL
    u.phone,
    'User' as full_name,  -- Default name for phone users
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
WHERE u.phone IS NOT NULL 
    AND u.email IS NULL  -- Phone-only users
    AND up.id IS NULL;

-- 6. Show final verification
SELECT 'Final verification:' as info;
SELECT 
    'public.users total' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL OR phone IS NOT NULL
UNION ALL
SELECT 
    'public.users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'public.users without profiles' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.email IS NOT NULL OR u.phone IS NOT NULL) AND up.id IS NULL;

-- 7. Show phone-only users with their new profiles
SELECT 'Phone-only users with profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    up.created_at as profile_created_at,
    u.created_at as user_created_at
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.phone IS NOT NULL AND u.email IS NULL
ORDER BY up.created_at DESC
LIMIT 10;

-- 8. Show all users with profiles (including phone-only)
SELECT 'All users with profiles:' as info;
SELECT 
    u.id,
    u.email,
    u.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    CASE 
        WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'BOTH'
        WHEN u.email IS NOT NULL THEN 'EMAIL ONLY'
        WHEN u.phone IS NOT NULL THEN 'PHONE ONLY'
        ELSE 'NO CONTACT'
    END as contact_type
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
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
    'Users with profiles' as metric,
    COUNT(*) as count
FROM users u
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
UNION ALL
SELECT 
    'Email users' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'Phone-only users' as metric,
    COUNT(*) as count
FROM users
WHERE phone IS NOT NULL AND email IS NULL
UNION ALL
SELECT 
    'Users with both' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL AND phone IS NOT NULL;

-- ✅ DONE! Email constraint fixed and all users now have profiles.
