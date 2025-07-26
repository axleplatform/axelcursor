#!/bin/bash

# Script to debug RLS issues and profile creation problems
echo "🔍 Debugging RLS issues and profile creation problems..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it to your Supabase database URL"
    exit 1
fi

echo "📋 Running RLS diagnostics..."

# Create a temporary SQL file for diagnostics
cat > /tmp/rls_diagnostics.sql << 'EOF'
-- RLS Diagnostics Script
-- This script helps identify and fix RLS issues

-- 1. Check if RLS is enabled on user_profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 2. List all RLS policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 3. Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. Check if role column exists in users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- 5. Check role distribution in users table
SELECT 
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY count DESC;

-- 6. Check user_profiles count
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- 7. Check for orphaned profiles (user_profiles without corresponding users)
SELECT 
    up.user_id,
    up.email
FROM user_profiles up
LEFT JOIN users u ON up.user_id = u.id
WHERE u.id IS NULL
LIMIT 10;

-- 8. Check for users without profiles
SELECT 
    u.id,
    u.email,
    u.role
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL
AND u.role = 'customer'
LIMIT 10;

-- 9. Test RLS policies with a sample user (if any exist)
DO $$
DECLARE
    test_user_id UUID;
    test_user_email TEXT;
BEGIN
    -- Get a sample user for testing
    SELECT id, email INTO test_user_id, test_user_email
    FROM users 
    WHERE role = 'customer' 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing RLS policies with user: % (%)', test_user_email, test_user_id;
        
        -- Test if we can select user_profiles for this user
        IF EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = test_user_id
        ) THEN
            RAISE NOTICE '✅ User profile exists for test user';
        ELSE
            RAISE NOTICE '❌ No user profile found for test user';
        END IF;
    ELSE
        RAISE NOTICE 'No test users found';
    END IF;
END $$;

-- 10. Check authentication context
SELECT 
    current_setting('request.jwt.claims', true) as jwt_claims,
    current_setting('role', true) as current_role,
    auth.uid() as current_user_id,
    auth.role() as auth_role;

-- 11. List all tables with RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE rowsecurity = true
ORDER BY tablename;

-- 12. Check for any constraint violations
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';
EOF

# Run the diagnostics
echo "🔍 Running SQL diagnostics..."
psql "$DATABASE_URL" -f /tmp/rls_diagnostics.sql

# Clean up
rm /tmp/rls_diagnostics.sql

echo "✅ RLS diagnostics completed!"
echo ""
echo "📋 Next steps:"
echo "1. Review the output above for any RLS policy issues"
echo "2. Check if user_profiles table has RLS enabled"
echo "3. Verify that INSERT and UPDATE policies exist"
echo "4. Ensure service_role has full access"
echo "5. Test the onboarding flow again"
