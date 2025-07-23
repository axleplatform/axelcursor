-- Add profile_status column to users table
-- This column helps quickly identify user account types

-- Add profile_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_status'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_status VARCHAR(20) DEFAULT 'no';
        CREATE INDEX IF NOT EXISTS idx_users_profile_status ON users(profile_status);
        
        -- Update existing users based on their current state
        -- Mechanics: Set profile_status = 'mechanic'
        UPDATE users 
        SET profile_status = 'mechanic' 
        WHERE id IN (
            SELECT DISTINCT user_id 
            FROM mechanic_profiles 
            WHERE user_id IS NOT NULL
        );
        
        -- Customers with user_profiles: Set profile_status = 'customer'
        UPDATE users 
        SET profile_status = 'customer' 
        WHERE id IN (
            SELECT DISTINCT user_id 
            FROM user_profiles 
            WHERE user_id IS NOT NULL
        );
        
        -- Temporary/guest users: Keep profile_status = 'no' (default)
        -- This includes users with account_type = 'temporary', 'phone_only', etc.
    END IF;
END $$;

-- Create trigger to automatically set profile_status when user_profiles record is created
CREATE OR REPLACE FUNCTION update_profile_status_on_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user_profiles record is created, set profile_status = 'customer'
    UPDATE users 
    SET profile_status = 'customer'
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set profile_status when user_profiles record is deleted
CREATE OR REPLACE FUNCTION update_profile_status_on_user_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user_profiles record is deleted, check if user has mechanic profile
    -- If not, set profile_status = 'no'
    UPDATE users 
    SET profile_status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM mechanic_profiles 
            WHERE user_id = OLD.user_id
        ) THEN 'mechanic'
        ELSE 'no'
    END
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set profile_status when mechanic_profiles record is created
CREATE OR REPLACE FUNCTION update_profile_status_on_mechanic_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a mechanic_profiles record is created, set profile_status = 'mechanic'
    UPDATE users 
    SET profile_status = 'mechanic'
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set profile_status when mechanic_profiles record is deleted
CREATE OR REPLACE FUNCTION update_profile_status_on_mechanic_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a mechanic_profiles record is deleted, check if user has user_profiles
    -- If not, set profile_status = 'no'
    UPDATE users 
    SET profile_status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = OLD.user_id
        ) THEN 'customer'
        ELSE 'no'
    END
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_profile_status_user_profile ON user_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_user_profile_delete ON user_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_mechanic_profile ON mechanic_profiles;
DROP TRIGGER IF EXISTS trigger_update_profile_status_mechanic_profile_delete ON mechanic_profiles;

-- Create triggers
CREATE TRIGGER trigger_update_profile_status_user_profile
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_user_profile();

CREATE TRIGGER trigger_update_profile_status_user_profile_delete
    AFTER DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_user_profile_delete();

CREATE TRIGGER trigger_update_profile_status_mechanic_profile
    AFTER INSERT ON mechanic_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_mechanic_profile();

CREATE TRIGGER trigger_update_profile_status_mechanic_profile_delete
    AFTER DELETE ON mechanic_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_status_on_mechanic_profile_delete();

-- Add comments for documentation
COMMENT ON COLUMN users.profile_status IS 'User account type: customer, mechanic, or no (temporary/guest)';
COMMENT ON FUNCTION update_profile_status_on_user_profile() IS 'Automatically sets profile_status to customer when user_profiles record is created';
COMMENT ON FUNCTION update_profile_status_on_mechanic_profile() IS 'Automatically sets profile_status to mechanic when mechanic_profiles record is created'; 