-- Ensure mechanic_id column exists in appointments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'mechanic_id'
    ) THEN
        -- Add mechanic_id column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN mechanic_id UUID REFERENCES mechanics(id);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
    END IF;
END $$;

-- Force refresh the schema cache
SELECT pg_reload_conf(); 