-- Create mechanic_skipped_appointments table
CREATE TABLE IF NOT EXISTS mechanic_skipped_appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mechanic_id UUID NOT NULL REFERENCES mechanic_profiles(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mechanic_id, appointment_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_mechanic_id ON mechanic_skipped_appointments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_appointment_id ON mechanic_skipped_appointments(appointment_id);

-- Add RLS policies
ALTER TABLE mechanic_skipped_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view their own skipped appointments"
    ON mechanic_skipped_appointments
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM mechanic_profiles WHERE id = mechanic_id
    ));

CREATE POLICY "Mechanics can insert their own skipped appointments"
    ON mechanic_skipped_appointments
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM mechanic_profiles WHERE id = mechanic_id
    ));

-- Add function to check if all mechanics have skipped
CREATE OR REPLACE FUNCTION check_all_mechanics_skipped(appointment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_mechanics INTEGER;
    skipped_mechanics INTEGER;
BEGIN
    -- Count total mechanics in the area
    SELECT COUNT(*) INTO total_mechanics
    FROM mechanic_profiles mp
    WHERE EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.id = appointment_id
        AND ST_DWithin(
            mp.location::geography,
            a.location::geography,
            50000  -- 50km radius
        )
    );

    -- Count mechanics who have skipped
    SELECT COUNT(*) INTO skipped_mechanics
    FROM mechanic_skipped_appointments
    WHERE appointment_id = check_all_mechanics_skipped.appointment_id;

    RETURN total_mechanics > 0 AND total_mechanics = skipped_mechanics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to auto-cancel old appointments
CREATE OR REPLACE FUNCTION auto_cancel_old_appointments()
RETURNS void AS $$
BEGIN
    UPDATE appointments
    SET status = 'cancelled'
    WHERE status = 'pending'
    AND appointment_date < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 