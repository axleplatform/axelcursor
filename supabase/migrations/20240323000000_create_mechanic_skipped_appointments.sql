-- Create mechanic_skipped_appointments table
CREATE TABLE IF NOT EXISTS public.mechanic_skipped_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanic_id UUID NOT NULL REFERENCES public.mechanic_profiles(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mechanic_id, appointment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_mechanic 
ON public.mechanic_skipped_appointments(mechanic_id);

CREATE INDEX IF NOT EXISTS idx_mechanic_skipped_appointments_appointment 
ON public.mechanic_skipped_appointments(appointment_id);

-- Enable RLS
ALTER TABLE public.mechanic_skipped_appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mechanics can skip appointments" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can view their own skipped appointments" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can insert skips" ON public.mechanic_skipped_appointments;
DROP POLICY IF EXISTS "Mechanics can view their skips" ON public.mechanic_skipped_appointments;

-- Policy for INSERT: Check that the user owns the mechanic profile
CREATE POLICY "Mechanics can insert skips" 
ON public.mechanic_skipped_appointments 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles 
        WHERE mechanic_profiles.id = mechanic_skipped_appointments.mechanic_id 
        AND mechanic_profiles.user_id = auth.uid()
    )
);

-- Policy for SELECT: Allow mechanics to see their own skips
CREATE POLICY "Mechanics can view their skips" 
ON public.mechanic_skipped_appointments 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles 
        WHERE mechanic_profiles.id = mechanic_skipped_appointments.mechanic_id 
        AND mechanic_profiles.user_id = auth.uid()
    )
);

-- Create function to check if all mechanics have skipped
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
