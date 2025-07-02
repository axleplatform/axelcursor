-- Add cancellation_reason column to appointments table
-- This column tracks why an appointment was cancelled

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column to appointments table';
    ELSE
        RAISE NOTICE 'cancellation_reason column already exists in appointments table';
    END IF;
END $$;

-- Add the column if it doesn't exist (for cancelled_at and cancelled_by as well)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added cancelled_at column to appointments table';
    ELSE
        RAISE NOTICE 'cancelled_at column already exists in appointments table';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE appointments ADD COLUMN cancelled_by VARCHAR(50);
        RAISE NOTICE 'Added cancelled_by column to appointments table';
    ELSE
        RAISE NOTICE 'cancelled_by column already exists in appointments table';
    END IF;
END $$;
