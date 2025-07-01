-- Create guest_profiles table for phone-based guest tracking
CREATE TABLE IF NOT EXISTS guest_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_normalized VARCHAR(20) NOT NULL UNIQUE, -- Phone without formatting: 5551234567
    shadow_user_id UUID NOT NULL UNIQUE,          -- Consistent shadow user ID across appointments
    first_appointment_id UUID,                    -- Track their first appointment
    total_appointments INTEGER DEFAULT 1,         -- Count of appointments
    last_seen TIMESTAMPTZ DEFAULT NOW(),          -- When they last booked
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON guest_profiles(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_shadow_user ON guest_profiles(shadow_user_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_last_seen ON guest_profiles(last_seen);

-- Add phone_normalized column to appointments table for linking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'phone_normalized'
    ) THEN
        ALTER TABLE appointments ADD COLUMN phone_normalized VARCHAR(20);
        CREATE INDEX IF NOT EXISTS idx_appointments_phone_normalized ON appointments(phone_normalized);
    END IF;
END $$;

-- Create function to automatically update guest profile stats
CREATE OR REPLACE FUNCTION update_guest_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update guest profile when appointment is created/updated with phone
    IF NEW.phone_normalized IS NOT NULL AND NEW.is_guest = true THEN
        INSERT INTO guest_profiles (
            phone_normalized,
            shadow_user_id,
            first_appointment_id,
            total_appointments,
            last_seen
        ) VALUES (
            NEW.phone_normalized,
            NEW.user_id,
            NEW.id,
            1,
            NOW()
        )
        ON CONFLICT (phone_normalized) DO UPDATE SET
            last_seen = NOW(),
            total_appointments = guest_profiles.total_appointments + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update guest stats
DROP TRIGGER IF EXISTS trigger_update_guest_stats ON appointments;
CREATE TRIGGER trigger_update_guest_stats
    AFTER INSERT OR UPDATE OF phone_normalized
    ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_profile_stats();

-- Add RLS policies for guest_profiles
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read/insert guest profiles (for guest bookings)
CREATE POLICY "Allow anonymous guest profile access" 
ON guest_profiles FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to read/update guest profiles
CREATE POLICY "Allow authenticated guest profile access" 
ON guest_profiles FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON guest_profiles TO anon;
GRANT ALL ON guest_profiles TO authenticated;
GRANT ALL ON guest_profiles TO service_role;
