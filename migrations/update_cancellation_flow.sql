-- Update cancellation flow: ensure all required columns exist
-- This migration ensures the appointments table has all necessary columns for the new cancellation flow

-- Add cancellation_reason column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add cancelled_at column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add cancelled_by column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);

-- Add cancellation_fee column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10, 2);

-- Add cancellation_type column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(50);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('cancellation_reason', 'cancelled_at', 'cancelled_by', 'cancellation_fee', 'cancellation_type')
ORDER BY column_name;

-- Add index on cancelled_at for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_at ON appointments(cancelled_at);

-- Add index on status for filtering cancelled appointments
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Force refresh the schema cache
SELECT pg_reload_conf();
