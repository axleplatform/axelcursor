-- Comprehensive schema verification and fix
DO $$
BEGIN
    -- 1. Appointments table verification
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'appointments'
    ) THEN
        RAISE EXCEPTION 'Appointments table does not exist';
    END IF;

    -- Ensure all required appointment columns exist
    DO $$
    DECLARE
        required_columns text[] := ARRAY[
            'id', 'location', 'appointment_date', 'status', 'price', 'phone_number',
            'car_runs', 'issue_description', 'selected_services', 'selected_car_issues',
            'notes', 'user_id', 'mechanic_id', 'selected_quote_id', 'source',
            'created_at', 'updated_at'
        ];
        col text;
    BEGIN
        FOREACH col IN ARRAY required_columns
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'appointments'
                AND column_name = col
            ) THEN
                RAISE NOTICE 'Missing column: %', col;
            END IF;
        END LOOP;
    END $$;

    -- 2. Vehicles table verification
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'vehicles'
    ) THEN
        RAISE EXCEPTION 'Vehicles table does not exist';
    END IF;

    -- Ensure all required vehicle columns exist
    DO $$
    DECLARE
        required_columns text[] := ARRAY[
            'id', 'appointment_id', 'year', 'make', 'model', 'vin',
            'mileage', 'color', 'created_at', 'updated_at'
        ];
        col text;
    BEGIN
        FOREACH col IN ARRAY required_columns
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'vehicles'
                AND column_name = col
            ) THEN
                RAISE NOTICE 'Missing column: %', col;
            END IF;
        END LOOP;
    END $$;

    -- 3. Mechanic profiles table verification
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'mechanic_profiles'
    ) THEN
        RAISE EXCEPTION 'Mechanic profiles table does not exist';
    END IF;

    -- 4. Mechanic quotes table verification
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'mechanic_quotes'
    ) THEN
        RAISE EXCEPTION 'Mechanic quotes table does not exist';
    END IF;

    -- Ensure all required mechanic quotes columns exist
    DO $$
    DECLARE
        required_columns text[] := ARRAY[
            'id', 'appointment_id', 'mechanic_id', 'price', 'eta',
            'notes', 'status', 'created_at', 'updated_at'
        ];
        col text;
    BEGIN
        FOREACH col IN ARRAY required_columns
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'mechanic_quotes'
                AND column_name = col
            ) THEN
                RAISE NOTICE 'Missing column: %', col;
            END IF;
        END LOOP;
    END $$;

    -- 5. Verify foreign key constraints
    DO $$
    BEGIN
        -- Check appointments -> mechanic_profiles
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'appointments'
            AND constraint_name = 'appointments_mechanic_id_fkey'
        ) THEN
            RAISE NOTICE 'Missing foreign key: appointments.mechanic_id -> mechanic_profiles.id';
        END IF;

        -- Check appointments -> mechanic_quotes
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'appointments'
            AND constraint_name = 'appointments_selected_quote_id_fkey'
        ) THEN
            RAISE NOTICE 'Missing foreign key: appointments.selected_quote_id -> mechanic_quotes.id';
        END IF;

        -- Check vehicles -> appointments
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'vehicles'
            AND constraint_name = 'vehicles_appointment_id_fkey'
        ) THEN
            RAISE NOTICE 'Missing foreign key: vehicles.appointment_id -> appointments.id';
        END IF;

        -- Check mechanic_quotes -> appointments
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'mechanic_quotes'
            AND constraint_name = 'mechanic_quotes_appointment_id_fkey'
        ) THEN
            RAISE NOTICE 'Missing foreign key: mechanic_quotes.appointment_id -> appointments.id';
        END IF;

        -- Check mechanic_quotes -> mechanic_profiles
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'mechanic_quotes'
            AND constraint_name = 'mechanic_quotes_mechanic_id_fkey'
        ) THEN
            RAISE NOTICE 'Missing foreign key: mechanic_quotes.mechanic_id -> mechanic_profiles.id';
        END IF;
    END $$;

    -- 6. Verify indexes
    DO $$
    BEGIN
        -- Appointments indexes
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'appointments'
            AND indexname = 'idx_appointments_status'
        ) THEN
            RAISE NOTICE 'Missing index: idx_appointments_status';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'appointments'
            AND indexname = 'idx_appointments_user_id'
        ) THEN
            RAISE NOTICE 'Missing index: idx_appointments_user_id';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'appointments'
            AND indexname = 'idx_appointments_mechanic_id'
        ) THEN
            RAISE NOTICE 'Missing index: idx_appointments_mechanic_id';
        END IF;

        -- Vehicles indexes
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'vehicles'
            AND indexname = 'idx_vehicles_appointment_id'
        ) THEN
            RAISE NOTICE 'Missing index: idx_vehicles_appointment_id';
        END IF;

        -- Mechanic quotes indexes
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'mechanic_quotes'
            AND indexname = 'idx_mechanic_quotes_appointment_id'
        ) THEN
            RAISE NOTICE 'Missing index: idx_mechanic_quotes_appointment_id';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = 'mechanic_quotes'
            AND indexname = 'idx_mechanic_quotes_mechanic_id'
        ) THEN
            RAISE NOTICE 'Missing index: idx_mechanic_quotes_mechanic_id';
        END IF;
    END $$;

END $$;
