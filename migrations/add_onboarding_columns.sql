-- Add onboarding-related columns to users table
-- This migration adds columns to support the 20-step customer onboarding flow

-- Add vehicles column (JSONB array of vehicle objects)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]';

-- Add referral source column
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add last service information (JSONB object)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_service JSONB;

-- Add notifications preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Add subscription plan information
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Add free trial information
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_ends_at TIMESTAMP;

-- Add onboarding completion status
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add complete onboarding data (JSONB object with all collected data)
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_referral_source ON users(referral_source);

-- Add comments for documentation
COMMENT ON COLUMN users.vehicles IS 'Array of vehicle objects with year, make, model, VIN, mileage, license plate';
COMMENT ON COLUMN users.referral_source IS 'How the user found the platform (Google Search, App Store, etc.)';
COMMENT ON COLUMN users.last_service IS 'Last service information including date, type, cost, mileage';
COMMENT ON COLUMN users.notifications_enabled IS 'Whether user has opted in to notifications';
COMMENT ON COLUMN users.subscription_plan IS 'User subscription plan (basic, premium)';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status (active, inactive, cancelled)';
COMMENT ON COLUMN users.free_trial_ends_at IS 'When the free trial expires';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user has completed the onboarding flow';
COMMENT ON COLUMN users.onboarding_data IS 'Complete onboarding data collected during the 20-step flow';
