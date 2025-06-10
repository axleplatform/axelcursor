-- Drop existing policies
DROP POLICY IF EXISTS "Mechanics can view their own skipped appointments" ON mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can insert their own skipped appointments" ON mechanic_skipped_appointments;

-- Add more permissive policies for debugging
CREATE POLICY "Enable read access for authenticated users"
    ON mechanic_skipped_appointments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON mechanic_skipped_appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add trigger to validate mechanic_id
CREATE OR REPLACE FUNCTION validate_mechanic_skip()
RETURNS TRIGGER AS $$
BEGIN
    -- Verify mechanic exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM mechanic_profiles 
        WHERE id = NEW.mechanic_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Invalid mechanic_id or unauthorized access';
    END IF;

    -- Verify appointment exists and is pending
    IF NOT EXISTS (
        SELECT 1 FROM appointments 
        WHERE id = NEW.appointment_id 
        AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Invalid appointment_id or appointment is not pending';
    END IF;

    -- Verify mechanic hasn't already skipped
    IF EXISTS (
        SELECT 1 FROM mechanic_skipped_appointments 
        WHERE mechanic_id = NEW.mechanic_id 
        AND appointment_id = NEW.appointment_id
    ) THEN
        RAISE EXCEPTION 'Mechanic has already skipped this appointment';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger
DROP TRIGGER IF EXISTS validate_mechanic_skip_trigger ON mechanic_skipped_appointments;
CREATE TRIGGER validate_mechanic_skip_trigger
    BEFORE INSERT ON mechanic_skipped_appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_mechanic_skip();

-- Add logging function
CREATE OR REPLACE FUNCTION log_mechanic_skip()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO mechanic_skipped_appointments_log (
        mechanic_id,
        appointment_id,
        action,
        error_message
    ) VALUES (
        NEW.mechanic_id,
        NEW.appointment_id,
        'skip',
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create log table
CREATE TABLE IF NOT EXISTS mechanic_skipped_appointments_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mechanic_id UUID NOT NULL,
    appointment_id UUID NOT NULL,
    action TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add log trigger
DROP TRIGGER IF EXISTS log_mechanic_skip_trigger ON mechanic_skipped_appointments;
CREATE TRIGGER log_mechanic_skip_trigger
    AFTER INSERT ON mechanic_skipped_appointments
    FOR EACH ROW
    EXECUTE FUNCTION log_mechanic_skip(); 