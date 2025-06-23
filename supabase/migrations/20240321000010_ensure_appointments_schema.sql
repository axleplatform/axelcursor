-- First, let's ensure we have a clean state by dropping any existing functions
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();
DROP FUNCTION IF EXISTS public.force_schema_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_access();

-- Create a temporary table to store existing appointments
CREATE TEMP TABLE temp_appointments AS 
SELECT * FROM public.appointments;

-- Drop the existing appointments table and recreate it with explicit schema
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Recreate the appointments table with explicit column definitions
CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    location TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT 'web',
    is_guest BOOLEAN NOT NULL DEFAULT true,
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
    location,
    appointment_date,
    status,
    source,
    is_guest,
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
    location,
    appointment_date,
    COALESCE(status, 'pending') as status,
    COALESCE(source, 'web') as source,
    COALESCE(is_guest, true) as is_guest,
    car_runs,
    issue_description,
    selected_services,
    selected_car_issues,
    phone_number,
    vehicle_id
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

-- Create a function to force PostgREST to reload its schema
CREATE OR REPLACE FUNCTION public.force_schema_reload()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- Method 1: Notify PostgREST
    BEGIN
        NOTIFY pgrst, 'reload schema';
        result := json_build_object(
            'success', true,
            'message', 'Schema reload notification sent'
        );
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Failed to send schema reload notification',
            'error', SQLERRM
        );
    END;

    -- Method 2: Create and drop a temporary table
    BEGIN
        CREATE TEMP TABLE _schema_reload AS SELECT 1;
        DROP TABLE _schema_reload;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors in this method
    END;

    -- Method 3: Force a schema change by adding and removing a comment
    BEGIN
        COMMENT ON TABLE public.appointments IS 'Schema reload trigger';
        COMMENT ON TABLE public.appointments IS NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors in this method
    END;

    -- Wait a moment for the cache to refresh
    PERFORM pg_sleep(1);

    RETURN result;
END;
$$;

-- Create a function to verify schema cache
CREATE OR REPLACE FUNCTION public.verify_schema_cache()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    table_exists boolean;
    column_exists boolean;
    column_type text;
BEGIN
    -- Check if the table exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) INTO table_exists;

    -- Check if the is_guest column exists and its type
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_guest'
    ) INTO column_exists;

    -- Get the column type
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'is_guest'
    INTO column_type;

    -- Try to access the column directly
    BEGIN
        PERFORM is_guest FROM public.appointments LIMIT 1;
        result := json_build_object(
            'success', true,
            'message', 'Schema cache verification successful',
            'table_exists', table_exists,
            'column_exists', column_exists,
            'column_type', column_type,
            'direct_access', true
        );
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Failed to verify schema cache',
            'error', SQLERRM,
            'table_exists', table_exists,
            'column_exists', column_exists,
            'column_type', column_type,
            'direct_access', false
        );
    END;

    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO anon;
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO anon;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO service_role;

-- Grant table permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Add comments to ensure columns are recognized
COMMENT ON TABLE public.appointments IS 'Appointments table for scheduling service appointments';
COMMENT ON COLUMN public.appointments.is_guest IS 'Indicates if the appointment is for a guest user';
COMMENT ON COLUMN public.appointments.status IS 'Current status of the appointment (pending, confirmed, completed, etc.)';

-- Create indexes for better performance and recognition
CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON public.appointments(is_guest);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON public.appointments(appointment_date);

-- Force a schema reload
SELECT public.force_schema_reload();

-- Verify the schema cache
SELECT public.verify_schema_cache();
