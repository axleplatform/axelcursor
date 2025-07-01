-- Add is_guest column to appointments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'is_guest'
    ) THEN
        -- Add is_guest column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN is_guest BOOLEAN DEFAULT true;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON appointments(is_guest);
    END IF;
END $$;
