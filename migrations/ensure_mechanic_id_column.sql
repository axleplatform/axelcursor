-- First ensure the mechanic-profile table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'mechanic-profile'
    ) THEN
        CREATE TABLE mechanic-profile (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(255),
            avatar_url TEXT,
            bio TEXT,
            specialties TEXT[],
            experience VARCHAR(255),
            rating DECIMAL(3, 2),
            review_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_mechanic_profile_user_id ON mechanic-profile(user_id);
    END IF;
END $$;

-- Ensure mechanic_profiles table has UUID generation
DO $$
BEGIN
    -- Check if the uuid-ossp extension is available
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'uuid-ossp'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    END IF;

    -- Add trigger to ensure UUID generation for mechanic_profiles
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'ensure_mechanic_profile_uuid'
    ) THEN
        CREATE OR REPLACE FUNCTION ensure_mechanic_profile_uuid()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.id IS NULL OR NEW.id = '0' OR NEW.id = 0 THEN
                NEW.id := uuid_generate_v4();
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER ensure_mechanic_profile_uuid
        BEFORE INSERT OR UPDATE ON mechanic_profiles
        FOR EACH ROW
        EXECUTE FUNCTION ensure_mechanic_profile_uuid();
    END IF;
END $$;

-- Then ensure mechanic_id column exists in appointments table
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'mechanic_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE appointments ADD COLUMN mechanic_id UUID REFERENCES mechanic_profiles(id);
        
        -- Create an index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
    END IF;
END $$;
