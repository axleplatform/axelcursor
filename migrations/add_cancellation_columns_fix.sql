-- Add missing cancellation columns to appointments table
-- This fixes the auto-cancel function errors

-- Add cancellation_reason column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add cancelled_at column  
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add cancelled_by column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);

-- Add cancellation_fee column (used in some parts of the code)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10, 2);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('cancellation_reason', 'cancelled_at', 'cancelled_by', 'cancellation_fee')
ORDER BY column_name;

-- Force refresh the schema cache
SELECT pg_reload_conf(); 