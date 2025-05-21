-- Check if the column exists first to avoid errors
DO $$
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mechanic_profiles' 
        AND column_name = 'business_description'
    ) THEN
        ALTER TABLE mechanic_profiles ADD COLUMN business_description TEXT;
    END IF;
END $$;

-- Also ensure other related columns exist
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS other_business_description TEXT[];
