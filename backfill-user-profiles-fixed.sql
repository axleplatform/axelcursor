-- 🔧 BACKFILL USER PROFILES FOR EXISTING USERS (FIXED)
-- Run this in your Supabase SQL Editor

-- 1. First, let's see how many users have NULL emails
SELECT 
    'Users with NULL email' as metric,
    COUNT(*) as count
FROM auth.users 
WHERE email IS NULL
UNION ALL
SELECT 
    'Users with valid email' as metric,
    COUNT(*) as count
FROM auth.users 
WHERE email IS NOT NULL;

-- 2. Backfill user_profiles for users WITH valid emails only
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
    gen_random_uuid(),
    u.id,
    u.email,
    u.raw_user_meta_data->>'phone',
    u.raw_user_meta_data->>'full_name',
    false,
    'standard',
    true,
    'free',
    'basic',
    '[]'::jsonb,
    '{}'::jsonb,
    u.created_at,
    u.updated_at
FROM auth.users u
WHERE u.email IS NOT NULL  -- Only users with valid emails
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
  );

-- 3. Show the results
SELECT 
    'Total auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Users without profiles (with valid email)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
  )
UNION ALL
SELECT 
    'Users with NULL email (skipped)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE u.email IS NULL;

-- 4. Show some sample profiles created
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.phone,
    up.full_name,
    up.onboarding_completed,
    up.onboarding_type,
    up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 10;

-- 5. Show users that were skipped (NULL email)
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.created_at
FROM auth.users u
WHERE u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- ✅ DONE! User profiles created for users with valid emails only.
