-- First, check if mechanic_id column exists in mechanic_quotes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mechanic_quotes' AND column_name = 'mechanic_id'
    ) THEN
        -- Add mechanic_id column if it doesn't exist
        ALTER TABLE mechanic_quotes ADD COLUMN mechanic_id UUID;
    END IF;
END $$;

-- Check if the foreign key constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'mechanic_quotes'
        AND constraint_name = 'mechanic_quotes_mechanic_id_fkey'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE mechanic_quotes 
        ADD CONSTRAINT mechanic_quotes_mechanic_id_fkey 
        FOREIGN KEY (mechanic_id) REFERENCES mechanic_profiles(id);
    END IF;
END $$;

-- Create index on mechanic_id for better performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'mechanic_quotes' AND indexname = 'idx_mechanic_quotes_mechanic_id'
    ) THEN
        CREATE INDEX idx_mechanic_quotes_mechanic_id ON mechanic_quotes(mechanic_id);
    END IF;
END $$;

-- Verify the constraint exists (for logging purposes)
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM (
    SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) AS fk_info
WHERE table_name = 'mechanic_quotes' AND foreign_table_name = 'mechanic_profiles';
