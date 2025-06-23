-- Ensure all required appointment columns exist with correct types
DO $$
BEGIN
    -- Define the required columns and their types
    CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        location TEXT NOT NULL,
        appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
        price DECIMAL(10, 2),
        phone_number VARCHAR(20),
        car_runs BOOLEAN,
        issue_description TEXT,
        selected_services TEXT[],
        selected_car_issues TEXT[],
        notes TEXT,
        user_id UUID REFERENCES auth.users(id),
        mechanic_id UUID REFERENCES mechanic_profiles(id),
        selected_quote_id UUID REFERENCES mechanic_quotes(id),
        source VARCHAR(50) DEFAULT 'landing_page',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Add missing columns if they don't exist
    DO $$
    DECLARE
        col record;
    BEGIN
        FOR col IN (
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'appointments'
        ) LOOP
            -- Add missing columns
            IF col.column_name NOT IN (
                'id', 'location', 'appointment_date', 'status', 'price',
                'phone_number', 'car_runs', 'issue_description', 'selected_services',
                'selected_car_issues', 'notes', 'user_id', 'mechanic_id',
                'selected_quote_id', 'source', 'created_at', 'updated_at'
            ) THEN
                EXECUTE format('ALTER TABLE appointments DROP COLUMN IF EXISTS %I', col.column_name);
            END IF;
        END LOOP;
    END $$;

    -- Ensure all required columns exist
    DO $$
    BEGIN
        -- Add missing columns with correct types
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'selected_services'
        ) THEN
            ALTER TABLE appointments ADD COLUMN selected_services TEXT[];
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'selected_car_issues'
        ) THEN
            ALTER TABLE appointments ADD COLUMN selected_car_issues TEXT[];
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'car_runs'
        ) THEN
            ALTER TABLE appointments ADD COLUMN car_runs BOOLEAN;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'source'
        ) THEN
            ALTER TABLE appointments ADD COLUMN source VARCHAR(50) DEFAULT 'landing_page';
        END IF;
    END $$;

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);
    CREATE INDEX IF NOT EXISTS idx_appointments_car_runs ON appointments(car_runs);
END $$;

-- Force refresh the schema cache
SELECT pg_reload_conf();
