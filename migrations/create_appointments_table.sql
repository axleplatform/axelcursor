-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location TEXT NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  price DECIMAL(10, 2),
  phone_number VARCHAR(20),
  car_runs BOOLEAN,
  issue_description TEXT,
  selected_services TEXT[],
  selected_car_issues TEXT[],
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  mechanic_id UUID REFERENCES mechanic_profiles(id),
  selected_quote_id UUID REFERENCES mechanic_quotes(id),
  source VARCHAR(50) DEFAULT 'landing_page',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON appointments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);
