-- Create user_profiles table for customer accounts
-- This table will store customer-specific profile information
-- Mechanics will continue using the mechanic_profiles table

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
    onboarding_type TEXT, -- 'post_appointment', 'full', etc.
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Allow service role to manage user profiles (for OAuth callbacks and admin functions)
CREATE POLICY "Service role can manage user profiles" ON user_profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Customer profile information - separate from mechanic_profiles';
COMMENT ON COLUMN user_profiles.onboarding_type IS 'Type of onboarding completed: post_appointment, full, etc.';
COMMENT ON COLUMN user_profiles.vehicles IS 'Array of vehicle objects with year, make, model, VIN, mileage, license plate';
COMMENT ON COLUMN user_profiles.communication_preferences IS 'JSON object with communication preferences';
COMMENT ON COLUMN user_profiles.notification_settings IS 'JSON object with notification settings'; 