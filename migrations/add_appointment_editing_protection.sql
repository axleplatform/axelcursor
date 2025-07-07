-- Add appointment editing protection columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_being_edited BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Create appointment_updates table for real-time notifications
CREATE TABLE IF NOT EXISTS appointment_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for appointment_updates
ALTER TABLE appointment_updates ENABLE ROW LEVEL SECURITY;

-- Allow mechanics to read appointment updates
CREATE POLICY "Mechanics can read appointment updates" ON appointment_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mechanic_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert appointment updates
CREATE POLICY "Users can insert appointment updates" ON appointment_updates
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_updates_appointment_id ON appointment_updates(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_updates_created_at ON appointment_updates(created_at); 