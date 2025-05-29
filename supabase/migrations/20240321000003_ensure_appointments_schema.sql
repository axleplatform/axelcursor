-- Drop existing schema cache refresh function if it exists
DROP FUNCTION IF EXISTS refresh_schema_cache();

-- Create a function to refresh schema cache
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
    
    -- Wait a moment for the cache to refresh
    PERFORM pg_sleep(1);
END;
$$;

-- Ensure all required columns exist
DO $$ 
BEGIN
    -- Create appointments table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        CREATE TABLE appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            location TEXT NOT NULL,
            appointment_date TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL,
            price NUMERIC,
            phone_number TEXT NOT NULL,
            car_runs BOOLEAN,
            issue_description TEXT,
            selected_services TEXT[],
            selected_car_issues TEXT[],
            notes TEXT,
            user_id UUID,
            mechanic_id UUID,
            selected_quote_id UUID,
            source TEXT NOT NULL,
            is_guest BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'is_guest') THEN
            ALTER TABLE appointments ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT true;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'car_runs') THEN
            ALTER TABLE appointments ADD COLUMN car_runs BOOLEAN;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'source') THEN
            ALTER TABLE appointments ADD COLUMN source TEXT NOT NULL DEFAULT 'landing_page';
        END IF;
    END IF;

    -- Ensure status check constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'appointments' 
        AND constraint_name = 'appointments_status_check'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_status_check 
        CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled'));
    END IF;

    -- Handle any existing camelCase columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'carRuns') THEN
        UPDATE appointments SET car_runs = "carRuns" WHERE car_runs IS NULL;
        ALTER TABLE appointments DROP COLUMN "carRuns";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'isGuest') THEN
        UPDATE appointments SET is_guest = "isGuest" WHERE is_guest IS NULL;
        ALTER TABLE appointments DROP COLUMN "isGuest";
    END IF;
END $$;

-- Refresh schema cache
SELECT refresh_schema_cache();

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments'
ORDER BY ordinal_position; 