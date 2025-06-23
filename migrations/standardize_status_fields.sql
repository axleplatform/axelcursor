-- Standardize appointment statuses
ALTER TABLE appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check,
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('draft', 'pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Standardize mechanic quote statuses
ALTER TABLE mechanic_quotes 
  DROP CONSTRAINT IF EXISTS mechanic_quotes_status_check,
  ADD CONSTRAINT mechanic_quotes_status_check 
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Add trigger to update appointment status when quote is accepted
CREATE OR REPLACE FUNCTION update_appointment_status_on_quote_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    UPDATE appointments 
    SET status = 'confirmed',
        mechanic_id = NEW.mechanic_id,
        selected_quote_id = NEW.id,
        updated_at = NOW()
    WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_quote_accept ON mechanic_quotes;
CREATE TRIGGER on_quote_accept
  AFTER UPDATE ON mechanic_quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION update_appointment_status_on_quote_accept();

-- Add real-time publication for appointments and quotes
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE mechanic_quotes;
