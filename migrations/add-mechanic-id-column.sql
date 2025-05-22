-- Check if mechanic_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'mechanic_id'
    ) THEN
        -- Add mechanic_id column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN mechanic_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
