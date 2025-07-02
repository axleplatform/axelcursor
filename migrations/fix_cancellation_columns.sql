-- Fix missing cancellation columns in appointments table
-- Run this in your Supabase Dashboard -> SQL Editor

-- Add cancellation_reason column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add cancelled_at column  
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add cancelled_by column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('cancellation_reason', 'cancelled_at', 'cancelled_by')
ORDER BY column_name;
