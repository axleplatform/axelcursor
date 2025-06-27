-- Fix mechanic_quotes foreign key reference from 'mechanics' to 'mechanic_profiles'
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'mechanic_quotes'
        AND constraint_name = 'mechanic_quotes_mechanic_id_fkey'
    ) THEN
        ALTER TABLE mechanic_quotes DROP CONSTRAINT mechanic_quotes_mechanic_id_fkey;
    END IF;

    -- Add correct foreign key constraint referencing mechanic_profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'mechanic_quotes'
        AND constraint_name = 'mechanic_quotes_mechanic_id_fkey_fixed'
    ) THEN
        ALTER TABLE mechanic_quotes 
        ADD CONSTRAINT mechanic_quotes_mechanic_id_fkey_fixed 
        FOREIGN KEY (mechanic_id) REFERENCES mechanic_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Ensure UNIQUE constraint exists for preventing duplicate quotes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE' 
        AND table_name = 'mechanic_quotes'
        AND constraint_name = 'mechanic_quotes_mechanic_id_appointment_id_key'
    ) THEN
        ALTER TABLE mechanic_quotes 
        ADD CONSTRAINT mechanic_quotes_mechanic_id_appointment_id_key 
        UNIQUE (mechanic_id, appointment_id);
    END IF;

    -- Create index for performance if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'mechanic_quotes' 
        AND indexname = 'idx_mechanic_quotes_mechanic_id_fixed'
    ) THEN
        CREATE INDEX idx_mechanic_quotes_mechanic_id_fixed ON mechanic_quotes(mechanic_id);
    END IF;

    -- Verify the mechanic_profiles table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'mechanic_profiles'
    ) THEN
        RAISE EXCEPTION 'mechanic_profiles table does not exist. Cannot create foreign key constraint.';
    END IF;

END $$; 