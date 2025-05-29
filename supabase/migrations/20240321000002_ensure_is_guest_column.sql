-- Ensure is_guest column exists in appointments table
DO $$ 
BEGIN
    -- Check if is_guest column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'is_guest'
    ) THEN
        -- Add is_guest column if it doesn't exist
        ALTER TABLE appointments 
        ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT true;
    ELSE
        -- Ensure the column has the correct constraints
        ALTER TABLE appointments 
        ALTER COLUMN is_guest SET NOT NULL,
        ALTER COLUMN is_guest SET DEFAULT true;
    END IF;

    -- Check if isGuest column exists (camelCase version)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'isGuest'
    ) THEN
        -- Copy data from camelCase to snake_case if needed
        UPDATE appointments 
        SET is_guest = "isGuest" 
        WHERE is_guest IS NULL;

        -- Drop the camelCase column
        ALTER TABLE appointments 
        DROP COLUMN "isGuest";
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column exists and has correct type
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'is_guest'; 