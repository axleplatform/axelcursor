-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();
DROP FUNCTION IF EXISTS public.force_schema_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_access();

-- Create a temporary table to store existing appointments
CREATE TEMP TABLE temp_appointments AS SELECT * FROM public.appointments;

-- Drop the existing appointments table
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Recreate the appointments table with explicit column definitions
CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    location TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    source TEXT,
    car_runs BOOLEAN,
    issue_description TEXT,
    selected_services TEXT[],
    selected_car_issues TEXT[],
    phone_number TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id),
    mechanic_id UUID REFERENCES public.mechanic_profiles(id),
    selected_quote_id UUID REFERENCES public.mechanic_quotes(id),
    price DECIMAL(10,2),
    notes TEXT
);

-- Restore data from temporary table
INSERT INTO public.appointments (
    id, created_at, updated_at, user_id, location, appointment_date, status,
    source, car_runs, issue_description, selected_services, selected_car_issues,
    phone_number, vehicle_id, mechanic_id, selected_quote_id, price, notes
)
SELECT 
    id, created_at, updated_at, user_id, location, appointment_date, status,
    source, car_runs, issue_description, selected_services, selected_car_issues,
    phone_number, vehicle_id, mechanic_id, selected_quote_id, price, notes
FROM temp_appointments;

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for all operations
CREATE POLICY "Allow authenticated users to select appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow anonymous users to select appointments"
ON public.appointments FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow service role to select appointments"
ON public.appointments FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Allow authenticated users to insert appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow anonymous users to insert appointments"
ON public.appointments FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow service role to insert appointments"
ON public.appointments FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow mechanics to update assigned appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles
        WHERE id = mechanic_id
        AND user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mechanic_profiles
        WHERE id = mechanic_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Allow service role to update appointments"
ON public.appointments FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_mechanic_id ON public.appointments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON public.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);

-- Grant permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Create function to handle user account linking
CREATE OR REPLACE FUNCTION public.handle_user_account_linking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If the user is being updated from anonymous to authenticated
    IF OLD.raw_user_meta_data->>'is_anonymous' = 'true' 
       AND NEW.raw_user_meta_data->>'is_anonymous' = 'false' THEN
        
        -- Update appointments to link to the new user ID
        UPDATE public.appointments
        SET user_id = NEW.id
        WHERE user_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for user account linking
DROP TRIGGER IF EXISTS on_user_update ON auth.users;
CREATE TRIGGER on_user_update
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_account_linking();

-- Create function to refresh schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$;

-- Execute the refresh
SELECT public.refresh_schema_cache();
