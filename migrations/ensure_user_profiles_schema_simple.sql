-- Ensure user_profiles table has all required columns
-- This migration fixes 400 errors when inserting profile data
-- Uses individual statements for better compatibility

-- Add notifications_enabled column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added notifications_enabled column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'notifications_enabled column already exists';
END $$;

-- Add subscription_status column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
    RAISE NOTICE 'Added subscription_status column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'subscription_status column already exists';
END $$;

-- Add subscription_plan column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN subscription_plan TEXT;
    RAISE NOTICE 'Added subscription_plan column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'subscription_plan column already exists';
END $$;

-- Add free_trial_ends_at column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN free_trial_ends_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added free_trial_ends_at column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'free_trial_ends_at column already exists';
END $$;

-- Add vehicles column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN vehicles JSONB DEFAULT '[]';
    RAISE NOTICE 'Added vehicles column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'vehicles column already exists';
END $$;

-- Add referral_source column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN referral_source TEXT;
    RAISE NOTICE 'Added referral_source column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'referral_source column already exists';
END $$;

-- Add last_service column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN last_service JSONB;
    RAISE NOTICE 'Added last_service column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'last_service column already exists';
END $$;

-- Add onboarding_data column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN onboarding_data JSONB;
    RAISE NOTICE 'Added onboarding_data column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'onboarding_data column already exists';
END $$;

-- Add profile_completed_at column (ignore if exists)
DO $$
BEGIN
    ALTER TABLE user_profiles ADD COLUMN profile_completed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added profile_completed_at column to user_profiles';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'profile_completed_at column already exists';
END $$;

-- Update default values for existing records
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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position; 