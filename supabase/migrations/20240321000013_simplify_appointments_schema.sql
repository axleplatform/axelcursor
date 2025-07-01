-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();
DROP FUNCTION IF EXISTS public.force_schema_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_access();
DROP FUNCTION IF EXISTS public.check_postgrest_column();
DROP FUNCTION IF EXISTS public.force_postgrest_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_schema();

-- Create a function to handle user_id updates
CREATE OR REPLACE FUNCTION public.handle_user_id_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If the user_id is being updated from an anonymous ID to a real user ID
    IF OLD.user_id LIKE 'anon_%' AND NEW.user_id NOT LIKE 'anon_%' THEN
        -- Update all appointments for this anonymous user
        UPDATE public.appointments
        SET user_id = NEW.user_id,
            updated_at = now()
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create a temporary table to store existing appointments
CREATE TEMP TABLE temp_appointments AS 
SELECT * FROM public.appointments;

-- Drop the existing appointments table
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Recreate the appointments table with the new schema
CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    location TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT 'web',
    car_runs BOOLEAN,
    issue_description TEXT,
    selected_services TEXT[],
    selected_car_issues TEXT[],
    phone_number TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id)
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
    vehicle_id
)
SELECT 
    id,
    created_at,
    updated_at,
    -- For existing appointments, create an anonymous user_id
    'anon_' || gen_random_uuid()::text::uuid as user_id,
    location,
    appointment_date,
    COALESCE(status, 'pending') as status,
    COALESCE(source, 'web') as source,
    car_runs,
    issue_description,
    selected_services,
    selected_car_issues,
    phone_number,
    vehicle_id
FROM temp_appointments;

-- Drop the temporary table
DROP TABLE temp_appointments;

-- Create a trigger to handle user_id updates
CREATE TRIGGER handle_user_id_update
    AFTER UPDATE OF user_id ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_id_update();

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

-- Grant permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Add comments
COMMENT ON TABLE public.appointments IS 'Appointments table for scheduling service appointments';
COMMENT ON COLUMN public.appointments.user_id IS 'ID of the user who created the appointment (authenticated or anonymous)';
COMMENT ON COLUMN public.appointments.status IS 'Current status of the appointment (pending, confirmed, completed, etc.)';

-- Create a function to get appointments for a user
CREATE OR REPLACE FUNCTION public.get_user_appointments(p_user_id UUID)
RETURNS SETOF public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.appointments
    WHERE user_id = p_user_id
    ORDER BY appointment_date DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_appointments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_appointments(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_appointments(UUID) TO service_role;

-- Create a function to create an anonymous user
CREATE OR REPLACE FUNCTION public.create_anonymous_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_anon_id UUID;
BEGIN
    -- Generate a unique anonymous user ID
    v_anon_id := 'anon_' || gen_random_uuid()::text::uuid;
    
    -- Create an anonymous user in auth.users
    INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    VALUES (
        v_anon_id,
        v_anon_id::text || '@anonymous.local',
        '{"provider": "anonymous", "providers": ["anonymous"]}',
        '{"is_anonymous": true}'
    );
    
    RETURN v_anon_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO anon;
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO service_role;
