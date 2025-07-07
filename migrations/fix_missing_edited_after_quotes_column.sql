-- Add the missing edited_after_quotes column
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS edited_after_quotes BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mechanic_notified_of_edit BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_edited_after_quotes ON appointments(edited_after_quotes);
