-- 🔧 FIX BOTH TABLES TO HAVE EMAIL AND PHONE
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what columns each table actually has
SELECT 'public.users table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'public.user_profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns to user_profiles if they don't exist
DO $$ 
BEGIN
    -- Add phone_number column to user_profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'phone_number'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Added phone_number column to user_profiles';
    ELSE
        RAISE NOTICE 'phone_number column already exists in user_profiles';
    END IF;
END $$;

-- 3. Add missing columns to users if they don't exist
DO $$ 
BEGIN
    -- Add email column to users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to users';
    ELSE
        RAISE NOTICE 'email column already exists in users';
    END IF;
END $$;

-- 4. Show current data in both tables
SELECT 'Recent users data:' as info;
SELECT 
    id,
    email,
    phone,
    created_at
FROM users 
WHERE email IS NOT NULL OR phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Recent user_profiles data:' as info;
SELECT 
    id,
    user_id,
    email,
    phone_number,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Sync data between tables
-- Update user_profiles with data from users
UPDATE user_profiles 
SET 
    email = COALESCE(user_profiles.email, users_table.email),
    phone_number = COALESCE(user_profiles.phone_number, users_table.phone),
    updated_at = NOW()
FROM users users_table
WHERE user_profiles.user_id = users_table.id
    AND (
        user_profiles.email IS NULL AND users_table.email IS NOT NULL
        OR user_profiles.phone_number IS NULL AND users_table.phone IS NOT NULL
    );

-- Update users with data from user_profiles
UPDATE users 
SET 
    email = COALESCE(users.email, user_profiles.email),
    phone = COALESCE(users.phone, user_profiles.phone_number),
    updated_at = NOW()
FROM user_profiles
WHERE users.id = user_profiles.user_id
    AND (
        users.email IS NULL AND user_profiles.email IS NOT NULL
        OR users.phone IS NULL AND user_profiles.phone_number IS NOT NULL
    );

-- 6. Show final comparison
SELECT 
    u.id,
    u.email as users_email,
    up.email as profile_email,
    u.phone as users_phone,
    up.phone_number as profile_phone,
    CASE 
        WHEN u.email != up.email THEN 'EMAIL MISMATCH'
        WHEN u.phone != up.phone_number THEN 'PHONE MISMATCH'
        ELSE 'SYNCED'
    END as status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IS NOT NULL OR u.phone IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Show final table structures
SELECT 'Final users table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Final user_profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ DONE! Both tables should now have email and phone.
