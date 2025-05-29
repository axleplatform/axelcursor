-- Verify and ensure all required columns in appointments table
DO $$ 
BEGIN
    -- Create a temporary table with the expected schema
    CREATE TEMP TABLE expected_columns (
        column_name text,
        data_type text,
        is_nullable text
    );

    -- Insert expected columns
    INSERT INTO expected_columns (column_name, data_type, is_nullable) VALUES
        ('id', 'uuid', 'NO'),
        ('location', 'text', 'NO'),
        ('appointment_date', 'timestamp with time zone', 'NO'),
        ('status', 'text', 'NO'),
        ('price', 'numeric', 'YES'),
        ('phone_number', 'text', 'NO'),
        ('car_runs', 'boolean', 'YES'),
        ('issue_description', 'text', 'YES'),
        ('selected_services', 'text[]', 'YES'),
        ('selected_car_issues', 'text[]', 'YES'),
        ('notes', 'text', 'YES'),
        ('user_id', 'uuid', 'YES'),
        ('mechanic_id', 'uuid', 'YES'),
        ('selected_quote_id', 'uuid', 'YES'),
        ('source', 'text', 'NO'),
        ('is_guest', 'boolean', 'NO'),
        ('created_at', 'timestamp with time zone', 'NO'),
        ('updated_at', 'timestamp with time zone', 'NO');

    -- Check and add missing columns
    FOR col IN 
        SELECT column_name, data_type, is_nullable 
        FROM expected_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' 
            AND column_name = col.column_name
        ) THEN
            EXECUTE format('ALTER TABLE appointments ADD COLUMN %I %s', 
                col.column_name, 
                CASE 
                    WHEN col.data_type = 'text[]' THEN 'text[]'
                    WHEN col.data_type = 'timestamp with time zone' THEN 'timestamptz'
                    ELSE col.data_type
                END
            );
            
            -- Set NOT NULL constraint if required
            IF col.is_nullable = 'NO' THEN
                EXECUTE format('ALTER TABLE appointments ALTER COLUMN %I SET NOT NULL', col.column_name);
            END IF;
        END IF;
    END LOOP;

    -- Handle any existing camelCase columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'carRuns'
    ) THEN
        -- Copy data from camelCase to snake_case
        UPDATE appointments 
        SET car_runs = "carRuns" 
        WHERE car_runs IS NULL;

        -- Drop the camelCase column
        ALTER TABLE appointments 
        DROP COLUMN "carRuns";
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

    -- Drop temporary table
    DROP TABLE expected_columns;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments'
ORDER BY ordinal_position; 