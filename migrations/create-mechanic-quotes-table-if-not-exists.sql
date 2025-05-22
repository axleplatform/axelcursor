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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_appointment_id ON mechanic_quotes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_mechanic_id ON mechanic_quotes(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_status ON mechanic_quotes(status);
