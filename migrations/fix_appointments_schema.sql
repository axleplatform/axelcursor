-- Fix appointments table schema
DO $$
BEGIN
    -- Add is_guest column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'is_guest'
    ) THEN
        ALTER TABLE appointments ADD COLUMN is_guest BOOLEAN DEFAULT true;
    END IF;

    -- Add source column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'source'
    ) THEN
        ALTER TABLE appointments ADD COLUMN source VARCHAR(50) DEFAULT 'landing_page';
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Add mechanic_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'mechanic_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN mechanic_id UUID REFERENCES mechanics(id);
    END IF;

    -- Add selected_quote_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'selected_quote_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN selected_quote_id UUID REFERENCES mechanic_quotes(id);
    END IF;

    -- Update status check constraint
    ALTER TABLE appointments 
        DROP CONSTRAINT IF EXISTS appointments_status_check,
        ADD CONSTRAINT appointments_status_check 
        CHECK (status IN ('pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'));

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);
    CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON appointments(is_guest);
    CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
END $$; 