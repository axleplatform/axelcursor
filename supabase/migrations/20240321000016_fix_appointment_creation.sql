-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();
DROP FUNCTION IF EXISTS public.force_schema_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_access();

-- Create a temporary table to store existing appointments
CREATE TEMP TABLE temp_appointments AS 
SELECT * FROM public.appointments;

-- Drop the existing appointments table
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Recreate the appointments table with explicit column definitions
CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    location TEXT NOT NULL DEFAULT 'Mobile Service',
    appointment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT 'web',
    car_runs BOOLEAN,
    issue_description TEXT,
    selected_services TEXT[],
    selected_car_issues TEXT[],
    phone_number TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id),
    mechanic_id UUID REFERENCES public.mechanic_profiles(id),
    selected_quote_id UUID REFERENCES public.mechanic_quotes(id),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'pending_payment'))
);

-- Restore the data from the temporary table
INSERT INTO public.appointments (
    id,
    created_at,
    updated_at,
    user_id,
    location,
    appointment_date,
    status,
    source,
    car_runs,
    issue_description,
    selected_services,
    selected_car_issues,
    phone_number,
    vehicle_id,
    mechanic_id,
    selected_quote_id
)
SELECT 
    id,
    created_at,
    updated_at,
    COALESCE(user_id, 'anon_' || gen_random_uuid()::text::uuid) as user_id,
    COALESCE(location, 'Mobile Service') as location,
    COALESCE(appointment_date, now()) as appointment_date,
    COALESCE(status, 'pending') as status,
    COALESCE(source, 'web') as source,
    car_runs,
    issue_description,
    selected_services,
    selected_car_issues,
    phone_number,
    vehicle_id,
    mechanic_id,
    selected_quote_id
FROM temp_appointments;

-- Drop the temporary table
DROP TABLE temp_appointments;

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for all operations
CREATE POLICY "Enable read access for all users" 
ON public.appointments FOR SELECT 
TO authenticated, anon, service_role
USING (true);

CREATE POLICY "Enable insert for all users" 
ON public.appointments FOR INSERT 
TO authenticated, anon, service_role
WITH CHECK (true);

CREATE POLICY "Enable update for all users" 
ON public.appointments FOR UPDATE 
TO authenticated, anon, service_role
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

-- Create a function to handle user account linking
CREATE OR REPLACE FUNCTION public.handle_user_account_linking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If the user is converting from anonymous to authenticated
    IF OLD.raw_user_meta_data->>'is_anonymous' = 'true' 
       AND NEW.raw_user_meta_data->>'is_anonymous' IS NULL THEN
        -- Update all appointments for this user
        UPDATE public.appointments
        SET user_id = NEW.id,
            updated_at = now()
        WHERE user_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create a trigger to handle user account linking
DROP TRIGGER IF EXISTS handle_user_account_linking ON auth.users;
CREATE TRIGGER handle_user_account_linking
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_account_linking();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO service_role;

-- Create a function to refresh schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
    
    -- Wait a moment for the cache to refresh
    PERFORM pg_sleep(1);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO service_role;

-- Force refresh the schema cache
SELECT public.refresh_schema_cache(); 