-- Fix mechanic_id references in appointments table
DO $$
BEGIN
    -- First, drop the existing foreign key constraint if it exists
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_mechanic_id_fkey;

    -- Then, add the correct foreign key constraint referencing mechanic_profiles
    ALTER TABLE appointments ADD CONSTRAINT appointments_mechanic_id_fkey 
        FOREIGN KEY (mechanic_id) REFERENCES mechanic_profiles(id);

    -- Create an index for performance if it doesn't exist
    CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
END $$; 