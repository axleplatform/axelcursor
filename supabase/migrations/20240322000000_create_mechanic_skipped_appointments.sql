-- Create the mechanic_skipped_appointments table
CREATE TABLE IF NOT EXISTS public.mechanic_skipped_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanic_id UUID NOT NULL REFERENCES public.mechanic_profiles(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    skipped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(mechanic_id, appointment_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_mechanic_id 
ON public.mechanic_skipped_appointments(mechanic_id);

CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_appointment_id 
ON public.mechanic_skipped_appointments(appointment_id);

-- Enable Row Level Security
ALTER TABLE public.mechanic_skipped_appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow mechanics to skip appointments" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can view their own skipped appointments" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can insert their own skipped appointments" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.mechanic_skipped_appointments;

-- Create new policies
CREATE POLICY "Allow mechanics to skip appointments"
ON public.mechanic_skipped_appointments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles
        WHERE id = mechanic_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Allow mechanics to view their own skipped appointments"
ON public.mechanic_skipped_appointments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles
        WHERE id = mechanic_id
        AND user_id = auth.uid()
    )
);

-- Create function to check if all mechanics have skipped an appointment
CREATE OR REPLACE FUNCTION public.check_all_mechanics_skipped(p_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_mechanics INTEGER;
    skipped_mechanics INTEGER;
BEGIN
    -- Get total number of active mechanics
    SELECT COUNT(*) INTO total_mechanics
    FROM public.mechanic_profiles
    WHERE is_active = true;

    -- Get number of mechanics who have skipped
    SELECT COUNT(*) INTO skipped_mechanics
    FROM public.mechanic_skipped_appointments
    WHERE appointment_id = p_appointment_id;

    -- Return true if all mechanics have skipped
    RETURN skipped_mechanics >= total_mechanics;
END;
$$; 