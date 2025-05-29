-- Ensure car_runs column exists with correct type
DO $$
BEGIN
    -- Drop the column if it exists with wrong type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'car_runs'
        AND data_type != 'boolean'
    ) THEN
        ALTER TABLE appointments DROP COLUMN car_runs;
    END IF;

    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'car_runs'
    ) THEN
        ALTER TABLE appointments ADD COLUMN car_runs BOOLEAN;
    END IF;

    -- Ensure the column allows NULL values
    ALTER TABLE appointments ALTER COLUMN car_runs DROP NOT NULL;

    -- Add index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'appointments'
        AND indexname = 'idx_appointments_car_runs'
    ) THEN
        CREATE INDEX idx_appointments_car_runs ON appointments(car_runs);
    END IF;
END $$;

-- Force refresh the schema cache
SELECT pg_reload_conf(); 