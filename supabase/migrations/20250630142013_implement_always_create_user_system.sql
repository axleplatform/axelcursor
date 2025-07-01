-- COMPLETE REWRITE: Always-Create-User System
-- This migration eliminates NULL user_id values and implements a clean user-first approach

-- Step 1: Drop unused tables
DROP TABLE IF EXISTS guest_users CASCADE;
DROP TABLE IF EXISTS guest_profiles CASCADE;

-- Step 2: Update users table to support the new system
DO $$
BEGIN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    END IF;

    -- Add account_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'account_type'
    ) THEN
        ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'temporary';
        CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
    END IF;

    -- Add created_via column for tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_via'
    ) THEN
        ALTER TABLE users ADD COLUMN created_via VARCHAR(50) DEFAULT 'web';
    END IF;
END $$;

-- Step 3: Create user records for all appointments with NULL user_id
DO $$
DECLARE
    appointment_record RECORD;
    new_user_id UUID;
BEGIN
    -- Loop through all appointments with NULL user_id
    FOR appointment_record IN 
        SELECT id, created_at, location, phone_number 
        FROM appointments 
        WHERE user_id IS NULL
    LOOP
        -- Generate a new UUID for the user
        new_user_id := gen_random_uuid();
        
        -- Create a new user record
        INSERT INTO auth.users (
            id,
            email,
            created_at,
            updated_at,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_sso_user,
            role
        ) VALUES (
            new_user_id,
            'temp_' || new_user_id || '@guest.axle.com', -- Temporary email
            appointment_record.created_at,
            NOW(),
            appointment_record.created_at, -- Auto-confirm temporary users
            '{"provider": "temp", "providers": ["temp"]}',
            '{"created_for": "guest_appointment", "original_appointment_id": "' || appointment_record.id || '"}',
            false,
            'authenticated'
        );

        -- Create corresponding public.users record
        INSERT INTO public.users (
            id,
            email,
            phone,
            account_type,
            created_via,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'temp_' || new_user_id || '@guest.axle.com',
            appointment_record.phone_number, -- Use appointment phone if available
            'temporary',
            'migration_from_null',
            appointment_record.created_at,
            NOW()
        );

        -- Update appointment to use the new user_id
        UPDATE appointments 
        SET user_id = new_user_id, updated_at = NOW()
        WHERE id = appointment_record.id;

        -- Log progress
        RAISE NOTICE 'Created user % for appointment %', new_user_id, appointment_record.id;
    END LOOP;
END $$;

-- Step 4: Add constraints to prevent NULL user_id in future
ALTER TABLE appointments ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Remove phone_normalized column from appointments (no longer needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'phone_normalized'
    ) THEN
        ALTER TABLE appointments DROP COLUMN phone_normalized;
    END IF;
END $$;

-- Step 6: Update RLS policies for the new system
-- Drop old policies
DROP POLICY IF EXISTS "Allow anonymous guest profile access" ON guest_profiles;
DROP POLICY IF EXISTS "Allow authenticated guest profile access" ON guest_profiles;

-- Update appointments policies to work with always-user system
DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON appointments;

-- Create new appointment policies
CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT TO authenticated, anon
    USING (user_id = auth.uid() OR is_guest = true);

CREATE POLICY "Users can create appointments" ON appointments
    FOR INSERT TO authenticated, anon
    WITH CHECK (user_id = auth.uid() OR is_guest = true);

CREATE POLICY "Users can update their appointments" ON appointments
    FOR UPDATE TO authenticated, anon
    USING (user_id = auth.uid() OR is_guest = true)
    WITH CHECK (user_id = auth.uid() OR is_guest = true);

-- Step 7: Create function to merge users when phone number matches
CREATE OR REPLACE FUNCTION merge_users_by_phone(phone_to_check VARCHAR(20), current_user_id UUID)
RETURNS UUID AS $$
DECLARE
    existing_user_id UUID;
    appointment_count INTEGER;
BEGIN
    -- Check if phone already exists on another user
    SELECT id INTO existing_user_id 
    FROM users 
    WHERE phone = phone_to_check AND id != current_user_id
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- Phone exists on another user - merge appointments
        UPDATE appointments 
        SET user_id = existing_user_id, updated_at = NOW()
        WHERE user_id = current_user_id;
        
        -- Get appointment count for the existing user
        SELECT COUNT(*) INTO appointment_count
        FROM appointments 
        WHERE user_id = existing_user_id;
        
        -- Update the existing user's account type based on appointment count
        UPDATE users 
        SET 
            account_type = CASE 
                WHEN appointment_count > 1 THEN 'phone_returning'
                ELSE 'phone_only' 
            END,
            updated_at = NOW()
        WHERE id = existing_user_id;
        
        -- Delete the temporary user (since we merged everything)
        DELETE FROM auth.users WHERE id = current_user_id;
        DELETE FROM users WHERE id = current_user_id;
        
        RETURN existing_user_id;
    ELSE
        -- Phone doesn't exist - just update current user
        UPDATE users 
        SET 
            phone = phone_to_check,
            account_type = 'phone_only',
            updated_at = NOW()
        WHERE id = current_user_id;
        
        RETURN current_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION merge_users_by_phone TO authenticated, anon;

-- Step 8: Create helper function to create temporary users
CREATE OR REPLACE FUNCTION create_temporary_user(user_email VARCHAR DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    temp_email VARCHAR;
BEGIN
    new_user_id := gen_random_uuid();
    temp_email := COALESCE(user_email, 'temp_' || new_user_id || '@guest.axle.com');
    
    -- Create auth.users record
    INSERT INTO auth.users (
        id,
        email,
        created_at,
        updated_at,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_sso_user,
        role
    ) VALUES (
        new_user_id,
        temp_email,
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "temp", "providers": ["temp"]}',
        '{"created_for": "guest_booking"}',
        false,
        'authenticated'
    );
    
    -- Create public.users record
    INSERT INTO public.users (
        id,
        email,
        account_type,
        created_via,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        temp_email,
        'temporary',
        'web_guest',
        NOW(),
        NOW()
    );
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_temporary_user TO authenticated, anon;

-- Step 9: Verify the migration worked
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM appointments WHERE user_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM appointments;
    
    RAISE NOTICE 'Migration complete: % total appointments, % with NULL user_id', total_count, null_count;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Still have % appointments with NULL user_id', null_count;
    END IF;
END $$;

-- Final success message
SELECT 'Always-Create-User system successfully implemented!' AS migration_status; 