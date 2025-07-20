-- Add role column to users table for Google OAuth
-- This allows us to distinguish between customers and mechanics

-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer';
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        
        -- Update existing users to have appropriate roles
        -- If they have a mechanic profile, they're a mechanic
        UPDATE users 
        SET role = 'mechanic' 
        WHERE id IN (
            SELECT DISTINCT user_id 
            FROM mechanic_profiles 
            WHERE user_id IS NOT NULL
        );
    END IF;
END $$;

-- Add RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow service role to manage users (for OAuth callbacks)
CREATE POLICY "Service role can manage users" ON users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
