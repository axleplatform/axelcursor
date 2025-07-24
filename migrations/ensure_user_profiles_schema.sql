-- Ensure user_profiles table has all required columns
-- This migration fixes 400 errors when inserting profile data

-- Step 1: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add notifications_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'notifications_enabled'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added notifications_enabled column to user_profiles';
    ELSE
        RAISE NOTICE 'notifications_enabled column already exists';
    END IF;

    -- Add subscription_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
        RAISE NOTICE 'Added subscription_status column to user_profiles';
    ELSE
        RAISE NOTICE 'subscription_status column already exists';
    END IF;

    -- Add subscription_plan column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_plan'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_plan TEXT;
        RAISE NOTICE 'Added subscription_plan column to user_profiles';
    ELSE
        RAISE NOTICE 'subscription_plan column already exists';
    END IF;

    -- Add free_trial_ends_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'free_trial_ends_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN free_trial_ends_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added free_trial_ends_at column to user_profiles';
    ELSE
        RAISE NOTICE 'free_trial_ends_at column already exists';
    END IF;

    -- Add vehicles column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'vehicles'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN vehicles JSONB DEFAULT '[]';
        RAISE NOTICE 'Added vehicles column to user_profiles';
    ELSE
        RAISE NOTICE 'vehicles column already exists';
    END IF;

    -- Add referral_source column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'referral_source'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN referral_source TEXT;
        RAISE NOTICE 'Added referral_source column to user_profiles';
    ELSE
        RAISE NOTICE 'referral_source column already exists';
    END IF;

    -- Add last_service column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_service'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_service JSONB;
        RAISE NOTICE 'Added last_service column to user_profiles';
    ELSE
        RAISE NOTICE 'last_service column already exists';
    END IF;

    -- Add onboarding_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'onboarding_data'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN onboarding_data JSONB;
        RAISE NOTICE 'Added onboarding_data column to user_profiles';
    ELSE
        RAISE NOTICE 'onboarding_data column already exists';
    END IF;

    -- Add profile_completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_completed_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added profile_completed_at column to user_profiles';
    ELSE
        RAISE NOTICE 'profile_completed_at column already exists';
    END IF;
END $$;

-- Step 2: Ensure default values are set for existing records
UPDATE user_profiles 
SET notifications_enabled = FALSE 
WHERE notifications_enabled IS NULL;

UPDATE user_profiles 
SET subscription_status = 'inactive' 
WHERE subscription_status IS NULL;

UPDATE user_profiles 
SET vehicles = '[]' 
WHERE vehicles IS NULL;

UPDATE user_profiles 
SET communication_preferences = '{}' 
WHERE communication_preferences IS NULL;

UPDATE user_profiles 
SET notification_settings = '{}' 
WHERE notification_settings IS NULL;

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify the schema
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- Count columns in user_profiles table
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles';
    
    RAISE NOTICE 'user_profiles table has % columns', column_count;
    RAISE NOTICE 'Schema verification completed successfully!';
    
    -- List all columns for verification
    RAISE NOTICE 'Columns in user_profiles table:';
    FOR col IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %, default: %)', 
            col.column_name, col.data_type, col.is_nullable, col.column_default;
    END LOOP;
END $$; 