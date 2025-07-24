-- Sync missing user profiles
-- This migration creates user_profiles for users that exist in users table but not in user_profiles
-- Specifically for users created on the appointment confirmation page

-- First, let's see what users are missing profiles
SELECT 
    u.id,
    u.email,
    u.phone,
    u.profile_status,
    u.account_type,
    u.role,
    u.created_at,
    CASE 
        WHEN up.id IS NULL THEN 'MISSING PROFILE'
        ELSE 'HAS PROFILE'
    END as profile_status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL
ORDER BY u.created_at DESC;

-- Create missing user profiles
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
    vehicles,
    communication_preferences,
    notification_settings,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    u.id as user_id,
    u.email,
    u.phone,
    COALESCE(u.full_name, '') as full_name,
    FALSE as onboarding_completed,
    CASE 
        WHEN u.account_type = 'full' THEN 'post_appointment'
        WHEN u.account_type = 'mechanic' THEN 'mechanic'
        ELSE 'full'
    END as onboarding_type,
    FALSE as notifications_enabled,
    'inactive' as subscription_status,
    '[]'::jsonb as vehicles,
    '{}'::jsonb as communication_preferences,
    '{}'::jsonb as notification_settings,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL
    AND u.account_type = 'full'  -- Only sync users with 'full' account type
    AND u.role = 'customer';     -- Only sync customers

-- Verify the sync worked
SELECT 
    u.id,
    u.email,
    u.phone,
    u.account_type,
    u.role,
    up.id as profile_id,
    up.onboarding_completed,
    up.onboarding_type
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.account_type = 'full'
    AND u.role = 'customer'
ORDER BY u.created_at DESC;

-- Show summary
SELECT 
    COUNT(*) as total_users,
    COUNT(up.id) as users_with_profiles,
    COUNT(*) - COUNT(up.id) as users_missing_profiles
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.account_type = 'full'
    AND u.role = 'customer'; 