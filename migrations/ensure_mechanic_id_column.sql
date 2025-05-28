-- First ensure the mechanics table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'mechanics'
    ) THEN
        CREATE TABLE mechanics (
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
        CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);
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