-- Remove is_guest column and its index
DO $$
BEGIN
    -- Drop the index first if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'appointments'
        AND indexname = 'idx_appointments_is_guest'
    ) THEN
        DROP INDEX idx_appointments_is_guest;
    END IF;

    -- Drop the column if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'is_guest'
    ) THEN
        ALTER TABLE appointments DROP COLUMN is_guest;
    END IF;
END $$;

-- Force refresh the schema cache
SELECT pg_reload_conf(); 