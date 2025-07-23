-- Add role column fix
-- This migration ensures the role column exists with proper constraints

-- Step 1: Add role column if it doesn't exist
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

-- Step 2: Update existing users with appropriate roles based on their profiles
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

-- Step 3: Set default role for remaining users
UPDATE users 
SET role = 'customer' 
WHERE role IS NULL;

-- Step 4: Ensure the check constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('customer', 'mechanic', 'anon'));
        RAISE NOTICE 'Role check constraint added';
    ELSE
        RAISE NOTICE 'Role check constraint already exists';
    END IF;
END $$;

-- Step 5: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify the migration
DO $$
DECLARE
    role_count INTEGER;
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

    RAISE NOTICE 'Role column migration completed successfully!';
    RAISE NOTICE 'Role distribution: %', (
        SELECT string_agg(role || ': ' || count, ', ') 
        FROM (SELECT role, COUNT(*) as count FROM users GROUP BY role) t
    );
END $$;
