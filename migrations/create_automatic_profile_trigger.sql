-- Create automatic profile creation trigger
-- This eliminates the need for complex client-side profile creation

-- Step 1: Create function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile for authenticated users (not anon)
  IF NEW.role != 'anon' THEN
    INSERT INTO user_profiles (
      id,
      user_id,
      email,
      phone,
      profile_status,
      account_type,
      onboarding_completed,
      onboarding_type,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      NEW.phone,
      'pending',
      NEW.account_type,
      FALSE,
      CASE 
        WHEN NEW.account_type = 'mechanic' THEN 'mechanic'
        ELSE 'post_appointment'
      END,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger
DROP TRIGGER IF EXISTS trigger_create_user_profile ON users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_trigger();

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION create_user_profile_trigger() TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Step 4: Refresh schema cache
NOTIFY pgrst, 'reload schema';
