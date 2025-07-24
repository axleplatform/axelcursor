-- Test single column addition
-- This is a simple test to verify the SQL syntax works correctly

-- Add just one column to test
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE;

-- Show the result
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'notifications_enabled';
