-- Drop all existing schema cache refresh functions
DROP FUNCTION IF EXISTS refresh_schema_cache();
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS notify_schema_reload();
DROP FUNCTION IF EXISTS public.notify_schema_reload();
DROP FUNCTION IF EXISTS verify_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();

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
    location TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
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
    status,
    source,
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

-- Create a new schema cache refresh function
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- Try to notify PostgREST
    BEGIN
        NOTIFY pgrst, 'reload schema';
        result := json_build_object(
            'success', true,
            'message', 'Schema cache refresh notification sent'
        );
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Failed to send schema cache refresh notification',
            'error', SQLERRM
        );
    END;

    -- Wait a moment for the cache to refresh
    PERFORM pg_sleep(1);

    RETURN result;
END;
$$;

-- Create a function to verify schema cache status
CREATE OR REPLACE FUNCTION public.verify_schema_cache()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- Check if we can access the appointments table and its columns
    BEGIN
        -- Verify appointments table exists
        PERFORM 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments';
        
        -- Verify is_guest column exists
        PERFORM 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_guest';
        
        result := json_build_object(
            'success', true,
            'message', 'Schema cache is accessible',
            'appointments_table_exists', true,
            'is_guest_column_exists', true
        );
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Failed to verify schema cache',
            'error', SQLERRM
        );
    END;

    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO anon;
GRANT EXECUTE ON FUNCTION public.verify_schema_cache() TO service_role;

-- Grant table permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Force a schema cache refresh
SELECT public.refresh_schema_cache();

-- Verify the schema cache
SELECT public.verify_schema_cache(); 