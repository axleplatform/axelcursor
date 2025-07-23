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
    u.profile_status,
    u.role
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL
LIMIT 10;

-- 9. Test RLS policy with a sample query (this will show if policies are working)
-- Note: This requires authentication context
DO $$
BEGIN
    RAISE NOTICE 'RLS Diagnostics completed. Check the results above.';
    RAISE NOTICE 'If you see 403 errors, the issue is likely:';
    RAISE NOTICE '1. User not properly authenticated';
    RAISE NOTICE '2. user_id does not match auth.uid()';
    RAISE NOTICE '3. RLS policies are too restrictive';
    RAISE NOTICE '4. Missing role column or incorrect role assignment';
END $$;
EOF

# Run the diagnostics
echo "🔍 Running RLS diagnostics..."
psql "$DATABASE_URL" -f /tmp/rls_diagnostics.sql

if [ $? -eq 0 ]; then
    echo "✅ RLS diagnostics completed successfully"
else
    echo "❌ Error: Failed to run RLS diagnostics"
    exit 1
fi

# Create a fix script for common RLS issues
cat > /tmp/fix_rls_issues.sql << 'EOF'
-- Fix common RLS issues

-- 1. Ensure role column exists in users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        
        -- Add check constraint for valid roles
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('customer', 'mechanic', 'anon'));
        
        RAISE NOTICE 'Role column added successfully';
    ELSE
        RAISE NOTICE 'Role column already exists';
    END IF;
END $$;

-- 2. Update existing users with appropriate roles
UPDATE users 
SET role = 'mechanic' 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM mechanic_profiles 
    WHERE user_id IS NOT NULL
)
AND (role IS NULL OR role = 'customer');

UPDATE users 
SET role = 'customer' 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM user_profiles 
    WHERE user_id IS NOT NULL
)
AND (role IS NULL OR role = 'anon');

-- Set default role for remaining users
UPDATE users 
SET role = 'customer' 
WHERE role IS NULL;

-- 3. Ensure user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    communication_preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_type TEXT,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    vehicles JSONB DEFAULT '[]',
    referral_source TEXT,
    last_service JSONB,
    notifications_enabled BOOLEAN DEFAULT FALSE,
    subscription_plan TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    free_trial_ends_at TIMESTAMP WITH TIME ZONE,
    onboarding_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);

-- 5. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage user profiles" ON user_profiles;

-- 7. Create comprehensive RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Allow service role to manage users
CREATE POLICY "Service role can manage users" ON users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 8. Create comprehensive RLS policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow service role to manage user profiles
CREATE POLICY "Service role can manage user profiles" ON user_profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 9. Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;

GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- 10. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 11. Verify the fixes
DO $$
DECLARE
    role_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Check that role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'Role column not found after migration';
    END IF;

    -- Check role distribution
    SELECT COUNT(*) INTO role_count FROM users WHERE role IS NULL;
    IF role_count > 0 THEN
        RAISE WARNING 'Found % users with NULL role, updating to customer', role_count;
        UPDATE users SET role = 'customer' WHERE role IS NULL;
    END IF;

    -- Check user_profiles count
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    RAISE NOTICE 'User profiles count: %', profile_count;

    RAISE NOTICE 'RLS fixes completed successfully!';
    RAISE NOTICE 'Role distribution: %', (
        SELECT string_agg(role || ': ' || count, ', ') 
        FROM (SELECT role, COUNT(*) as count FROM users GROUP BY role) t
    );
END $$;
EOF

echo ""
echo "🔧 Common RLS fixes available. Run the following to apply fixes:"
echo "psql \"\$DATABASE_URL\" -f /tmp/fix_rls_issues.sql"
echo ""
echo "📋 Summary of diagnostics:"
echo "• Checked RLS policies on user_profiles table"
echo "• Verified table structure and constraints"
echo "• Checked role column existence and distribution"
echo "• Identified orphaned profiles and users without profiles"
echo "• Created comprehensive fix script for common issues"
echo ""
echo "🚀 Next steps:"
echo "• Review the diagnostic output above"
echo "• Apply fixes if needed using the fix script"
echo "• Test profile creation flows"
echo "• Check Supabase logs for detailed error messages"
