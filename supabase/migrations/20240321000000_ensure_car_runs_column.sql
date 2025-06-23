-- Ensure car_runs column exists in appointments table
DO $$ 
BEGIN
    -- Check if car_runs column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'car_runs'
    ) THEN
        -- Add car_runs column if it doesn't exist
        ALTER TABLE appointments 
        ADD COLUMN car_runs BOOLEAN;
    END IF;

    -- Check if carRuns column exists (camelCase version)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'carRuns'
    ) THEN
        -- Copy data from camelCase to snake_case if needed
        UPDATE appointments 
        SET car_runs = "carRuns" 
        WHERE car_runs IS NULL;

        -- Drop the camelCase column
        ALTER TABLE appointments 
        DROP COLUMN "carRuns";
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
