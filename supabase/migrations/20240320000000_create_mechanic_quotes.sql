-- Create mechanic_quotes table
CREATE TABLE IF NOT EXISTS public.mechanic_quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mechanic_id UUID NOT NULL REFERENCES public.mechanic_profiles(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    eta TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_mechanic_id ON public.mechanic_quotes(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_appointment_id ON public.mechanic_quotes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_quotes_status ON public.mechanic_quotes(status);

-- Add RLS policies
ALTER TABLE public.mechanic_quotes ENABLE ROW LEVEL SECURITY;

-- Policy for mechanics to view their own quotes
CREATE POLICY "Mechanics can view their own quotes"
    ON public.mechanic_quotes
    FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.mechanic_profiles WHERE id = mechanic_id));

-- Policy for customers to view quotes for their appointments
DROP POLICY IF EXISTS "Customers can view quotes for their appointments" ON public.mechanic_quotes;

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

-- Policy for mechanics to create quotes
CREATE POLICY "Mechanics can create quotes"
    ON public.mechanic_quotes
    FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.mechanic_profiles WHERE id = mechanic_id));

-- Policy for mechanics to update their own quotes
CREATE POLICY "Mechanics can update their own quotes"
    ON public.mechanic_quotes
    FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM public.mechanic_profiles WHERE id = mechanic_id));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_mechanic_quotes_updated_at
    BEFORE UPDATE ON public.mechanic_quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
