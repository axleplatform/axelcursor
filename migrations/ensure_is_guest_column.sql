-- Ensure is_guest column exists with correct type and default
DO $$
BEGIN
    -- Drop the column if it exists with wrong type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'is_guest'
        AND data_type != 'boolean'
    ) THEN
        ALTER TABLE appointments DROP COLUMN is_guest;
    END IF;

    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'is_guest'
    ) THEN
        ALTER TABLE appointments ADD COLUMN is_guest BOOLEAN DEFAULT true;
    END IF;

    -- Ensure the default value is set correctly
    ALTER TABLE appointments ALTER COLUMN is_guest SET DEFAULT true;

    -- Add index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'appointments'
        AND indexname = 'idx_appointments_is_guest'
    ) THEN
        CREATE INDEX idx_appointments_is_guest ON appointments(is_guest);
    END IF;
END $$;
