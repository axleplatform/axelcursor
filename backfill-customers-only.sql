-- 🔧 BACKFILL USER PROFILES FOR CUSTOMERS ONLY (EXCLUDING MECHANICS)
-- Run this in your Supabase SQL Editor

-- 1. First, let's see the breakdown of user types
SELECT 
    'Total auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Users with mechanic_profiles (mechanics)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE EXISTS (
    SELECT 1 FROM mechanic_profiles mp WHERE mp.user_id = u.id
)
UNION ALL
SELECT 
    'Users without mechanic_profiles (potential customers)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM mechanic_profiles mp WHERE mp.user_id = u.id
)
UNION ALL
SELECT 
    'Users with valid email (potential customers)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mechanic_profiles mp WHERE mp.user_id = u.id
  );

-- 2. Backfill user_profiles for CUSTOMERS ONLY (exclude mechanics)
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
    SELECT 1 FROM mechanic_profiles mp WHERE mp.user_id = u.id  -- EXCLUDE MECHANICS
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id  -- Don't duplicate
  );

-- 3. Show the final results
SELECT 
    'Total auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user_profiles (customers)' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Total mechanic_profiles (mechanics)' as metric,
    COUNT(*) as count
FROM mechanic_profiles
UNION ALL
SELECT 
    'Customers without profiles' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mechanic_profiles mp WHERE mp.user_id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
  )
UNION ALL
SELECT 
    'Users with NULL email (skipped)' as metric,
    COUNT(*) as count
FROM auth.users u
WHERE u.email IS NULL;

-- 4. Show sample customer profiles created
SELECT 
    'CUSTOMER PROFILES CREATED:' as info,
    '' as detail
UNION ALL
SELECT 
    up.email as info,
    CONCAT('ID: ', up.user_id, ' | Created: ', up.created_at) as detail
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 10;

-- 5. Show mechanics (should NOT have user_profiles)
SELECT 
    'MECHANICS (should NOT have user_profiles):' as info,
    '' as detail
UNION ALL
SELECT 
    mp.email as info,
    CONCAT('ID: ', mp.user_id, ' | Profile: ', mp.id) as detail
FROM mechanic_profiles mp
ORDER BY mp.created_at DESC
LIMIT 10;

-- ✅ DONE! Only customers should have user_profiles, mechanics stay in mechanic_profiles.
