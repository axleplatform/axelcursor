-- Enable RLS on mechanic_quotes table
ALTER TABLE public.mechanic_quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Mechanics can insert their own quotes" ON public.mechanic_quotes;
DROP POLICY IF EXISTS "Mechanics can view their own quotes" ON public.mechanic_quotes;
DROP POLICY IF EXISTS "Customers can view quotes for their appointments" ON public.mechanic_quotes;
DROP POLICY IF EXISTS "Mechanics can update their own quotes" ON public.mechanic_quotes;

-- Allow mechanics to insert their own quotes
CREATE POLICY "Mechanics can insert their own quotes" 
ON public.mechanic_quotes 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles 
        WHERE mechanic_profiles.id = mechanic_quotes.mechanic_id 
        AND mechanic_profiles.user_id = auth.uid()
    )
);

-- Allow mechanics to view their own quotes
CREATE POLICY "Mechanics can view their own quotes" 
ON public.mechanic_quotes 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles 
        WHERE mechanic_profiles.id = mechanic_quotes.mechanic_id 
        AND mechanic_profiles.user_id = auth.uid()
    )
);

-- Allow customers to view quotes for their appointments
CREATE POLICY "Customers can view quotes for their appointments" 
ON public.mechanic_quotes 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.appointments 
        WHERE appointments.id = mechanic_quotes.appointment_id 
        AND appointments.user_id = auth.uid()
    )
);

-- Allow mechanics to update their own quotes
CREATE POLICY "Mechanics can update their own quotes" 
ON public.mechanic_quotes 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles 
        WHERE mechanic_profiles.id = mechanic_quotes.mechanic_id 
        AND mechanic_profiles.user_id = auth.uid()
    )
);
