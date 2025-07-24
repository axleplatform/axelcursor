-- Ensure user_profiles table has all required columns
-- This migration fixes 400 errors when inserting profile data
-- Uses completely literal SQL statements

-- Add notifications_enabled column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE;

-- Add subscription_status column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Add subscription_plan column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- Add free_trial_ends_at column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS free_trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add vehicles column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]';

-- Add referral_source column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add last_service column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_service JSONB;

-- Add onboarding_data column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- Add profile_completed_at column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Update default values for existing records
UPDATE user_profiles SET notifications_enabled = FALSE WHERE notifications_enabled IS NULL;

UPDATE user_profiles SET subscription_status = 'inactive' WHERE subscription_status IS NULL;

UPDATE user_profiles SET vehicles = '[]' WHERE vehicles IS NULL;

UPDATE user_profiles SET communication_preferences = '{}' WHERE communication_preferences IS NULL;

UPDATE user_profiles SET notification_settings = '{}' WHERE notification_settings IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'user_profiles' ORDER BY ordinal_position;
