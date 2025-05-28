-- Ensure user_id column exists in appointments table
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'user_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Create an index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
    END IF;
END $$; 