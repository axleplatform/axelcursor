-- Fix user_profiles foreign key constraint issue
-- The user_profiles table should not have a foreign key constraint on the id field
-- The id should be a separate UUID, and user_id should reference auth.users

-- First, let's check the current constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_profiles';

-- Drop the problematic foreign key constraint if it exists
DO $$
BEGIN
    -- Drop the foreign key constraint on the id field if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_name = 'user_profiles_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
        RAISE NOTICE 'Dropped user_profiles_id_fkey constraint';
    ELSE
        RAISE NOTICE 'user_profiles_id_fkey constraint does not exist';
    END IF;
END $$;

-- Verify the table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FOREIGN KEY'
        ELSE 'NONE'
    END as constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.column_name = kcu.column_name 
    AND c.table_name = kcu.table_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'user_profiles'
ORDER BY c.ordinal_position;

-- Ensure the user_id foreign key constraint exists and is correct
DO $$
BEGIN
    -- Check if user_id foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_name LIKE '%user_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add foreign key constraint for user_id to auth.users
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_profiles_user_id_fkey constraint';
    ELSE
        RAISE NOTICE 'user_id foreign key constraint already exists';
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Show final table structure
SELECT 
    'user_profiles table structure:' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position; 