-- Add auth_method column to user_profiles table if it doesn't exist
DO $$
BEGIN
    -- Check if auth_method column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'auth_method'
    ) THEN
        -- Add the auth_method column
        ALTER TABLE user_profiles 
        ADD COLUMN auth_method TEXT;
        
        RAISE NOTICE 'Added auth_method column to user_profiles table';
    ELSE
        RAISE NOTICE 'auth_method column already exists in user_profiles table';
    END IF;
END $$;

-- Add index for auth_method column for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_method ON user_profiles(auth_method);

-- Add comment to the column
COMMENT ON COLUMN user_profiles.auth_method IS 'Authentication method used by the user (email, phone, google, both, etc.)';
