-- Ensure all required vehicle columns exist
DO $$
BEGIN
    -- Check if vehicles table exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'vehicles'
    ) THEN
        CREATE TABLE vehicles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            appointment_id UUID REFERENCES appointments(id),
            year INTEGER NOT NULL,
            make VARCHAR(255) NOT NULL,
            model VARCHAR(255) NOT NULL,
            vin VARCHAR(17),
            mileage INTEGER,
            color VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'vehicles'
            AND column_name = 'mileage'
        ) THEN
            ALTER TABLE vehicles ADD COLUMN mileage INTEGER;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'vehicles'
            AND column_name = 'color'
        ) THEN
            ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'vehicles'
            AND column_name = 'vin'
        ) THEN
            ALTER TABLE vehicles ADD COLUMN vin VARCHAR(17);
        END IF;
    END IF;

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_vehicles_appointment_id ON vehicles(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
END $$;
