-- This migration script should be run manually through the Supabase SQL editor
-- or CLI before deploying the application

-- Create mechanic_quotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS mechanic_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id),
  price DECIMAL(10, 2) NOT NULL,
  eta VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, mechanic_id)
);

-- Add selected_quote_id column to appointments table if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS selected_quote_id UUID REFERENCES mechanic_quotes(id);

-- Add mechanic_id column to appointments table if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES mechanics(id);

-- Drop the incorrect column if it exists
ALTER TABLE appointments DROP COLUMN IF EXISTS is_gust;

-- Add source and is_guest columns to appointments table if they don't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'landing_page';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_appointment_id ON mechanic_quotes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_mechanic_id ON mechanic_quotes(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_status ON mechanic_quotes(status);
CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);
CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON appointments(is_guest);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
