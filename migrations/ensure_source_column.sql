-- Ensure source column exists in appointments table
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'source'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN source VARCHAR(50) DEFAULT 'landing_page';
        
        -- Create an index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);
    END IF;
END $$;
