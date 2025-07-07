-- Add columns to track edited appointments after quotes exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS edited_after_quotes BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mechanic_notified_of_edit BOOLEAN DEFAULT false;

-- Create appointment_edit_notifications table for tracking edit notifications
CREATE TABLE IF NOT EXISTS appointment_edit_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES mechanic_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for appointment_edit_notifications
ALTER TABLE appointment_edit_notifications ENABLE ROW LEVEL SECURITY;

-- Allow mechanics to read notifications for appointments they quoted
CREATE POLICY "Mechanics can read edit notifications" ON appointment_edit_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mechanic_quotes 
      WHERE mechanic_quotes.appointment_id = appointment_edit_notifications.appointment_id
      AND mechanic_quotes.mechanic_id = appointment_edit_notifications.mechanic_id
    )
  );

-- Allow authenticated users to insert edit notifications
CREATE POLICY "Users can insert edit notifications" ON appointment_edit_notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_edit_notifications_appointment_id ON appointment_edit_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_edit_notifications_mechanic_id ON appointment_edit_notifications(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_edit_notifications_created_at ON appointment_edit_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_edited_after_quotes ON appointments(edited_after_quotes);
CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_notified_of_edit ON appointments(mechanic_notified_of_edit); 