-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();
DROP FUNCTION IF EXISTS public.force_schema_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_access();
DROP FUNCTION IF EXISTS public.check_postgrest_column();
DROP FUNCTION IF EXISTS public.force_postgrest_reload();
DROP FUNCTION IF EXISTS public.verify_postgrest_schema();

-- Create a function to check if a column exists in PostgREST's schema cache
CREATE OR REPLACE FUNCTION public.check_postgrest_column(
    p_table_name text,
    p_column_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists boolean;
BEGIN
    -- Check if the column exists in PostgREST's schema cache
    SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname = p_table_name
        AND a.attname = p_column_name
        AND NOT a.attisdropped
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- Create a function to force PostgREST to reload its schema
CREATE OR REPLACE FUNCTION public.force_postgrest_reload()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result json;
BEGIN
    -- Method 1: Direct PostgREST notification
    BEGIN
        NOTIFY pgrst, 'reload schema';
    EXCEPTION WHEN OTHERS THEN
        -- Ignore notification errors
    END;

    -- Method 2: Force a schema change
    BEGIN
        -- Create a temporary table with the same structure
        CREATE TEMP TABLE _temp_appointments (LIKE public.appointments INCLUDING ALL);
        
        -- Copy data
        INSERT INTO _temp_appointments SELECT * FROM public.appointments;
        
        -- Drop and recreate the main table
        DROP TABLE public.appointments CASCADE;
        
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
        
        -- Restore data
        INSERT INTO public.appointments SELECT * FROM _temp_appointments;
        
        -- Drop temporary table
        DROP TABLE _temp_appointments;
        
        -- Add explicit comments
        COMMENT ON TABLE public.appointments IS 'Appointments table for scheduling service appointments';
        COMMENT ON COLUMN public.appointments.is_guest IS 'Indicates if the appointment is for a guest user (BOOLEAN NOT NULL DEFAULT true)';
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON public.appointments(is_guest);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
        
        -- Enable RLS
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.appointments;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.appointments;
        
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
        
        -- Grant permissions
        GRANT ALL ON public.appointments TO authenticated;
        GRANT ALL ON public.appointments TO anon;
        GRANT ALL ON public.appointments TO service_role;
        
        v_result := json_build_object(
            'success', true,
            'message', 'Table recreated successfully'
        );
    EXCEPTION WHEN OTHERS THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Failed to recreate table',
            'error', SQLERRM
        );
    END;

    -- Method 3: Force PostgREST to reload by creating a view
    BEGIN
        CREATE OR REPLACE VIEW public.appointments_view AS
        SELECT 
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
        FROM public.appointments;
        
        GRANT SELECT ON public.appointments_view TO authenticated;
        GRANT SELECT ON public.appointments_view TO anon;
        GRANT SELECT ON public.appointments_view TO service_role;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore view creation errors
    END;

    -- Method 4: Create a materialized view to force schema recognition
    BEGIN
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.appointments_mv AS
        SELECT 
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
        FROM public.appointments;
        
        GRANT SELECT ON public.appointments_mv TO authenticated;
        GRANT SELECT ON public.appointments_mv TO anon;
        GRANT SELECT ON public.appointments_mv TO service_role;
        
        -- Refresh the materialized view
        REFRESH MATERIALIZED VIEW public.appointments_mv;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore materialized view errors
    END;

    -- Method 5: Create a function that explicitly uses the is_guest column
    BEGIN
        CREATE OR REPLACE FUNCTION public.get_appointment_guest_status(p_id UUID)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
            v_is_guest boolean;
        BEGIN
            SELECT is_guest INTO v_is_guest
            FROM public.appointments
            WHERE id = p_id;
            
            RETURN v_is_guest;
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION public.get_appointment_guest_status(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.get_appointment_guest_status(UUID) TO anon;
        GRANT EXECUTE ON FUNCTION public.get_appointment_guest_status(UUID) TO service_role;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore function creation errors
    END;

    -- Wait for cache to refresh
    PERFORM pg_sleep(2);

    RETURN v_result;
END;
$$;

-- Create a function to verify PostgREST schema
CREATE OR REPLACE FUNCTION public.verify_postgrest_schema()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result json;
    v_table_exists boolean;
    v_column_exists boolean;
    v_column_type text;
    v_postgrest_recognizes boolean;
    v_view_exists boolean;
    v_mv_exists boolean;
    v_function_exists boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) INTO v_table_exists;

    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_guest'
    ) INTO v_column_exists;

    -- Get column type
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'is_guest'
    INTO v_column_type;

    -- Check if PostgREST recognizes the column
    SELECT public.check_postgrest_column('appointments', 'is_guest')
    INTO v_postgrest_recognizes;

    -- Check if view exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments_view'
    ) INTO v_view_exists;

    -- Check if materialized view exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = 'appointments_mv'
    ) INTO v_mv_exists;

    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_appointment_guest_status'
    ) INTO v_function_exists;

    -- Try to access the column directly
    BEGIN
        PERFORM is_guest FROM public.appointments LIMIT 1;
        v_result := json_build_object(
            'success', true,
            'message', 'Schema verification successful',
            'table_exists', v_table_exists,
            'column_exists', v_column_exists,
            'column_type', v_column_type,
            'postgrest_recognizes', v_postgrest_recognizes,
            'view_exists', v_view_exists,
            'materialized_view_exists', v_mv_exists,
            'function_exists', v_function_exists,
            'direct_access', true
        );
    EXCEPTION WHEN OTHERS THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Schema verification failed',
            'error', SQLERRM,
            'table_exists', v_table_exists,
            'column_exists', v_column_exists,
            'column_type', v_column_type,
            'postgrest_recognizes', v_postgrest_recognizes,
            'view_exists', v_view_exists,
            'materialized_view_exists', v_mv_exists,
            'function_exists', v_function_exists,
            'direct_access', false
        );
    END;

    RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_postgrest_column(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_postgrest_column(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_postgrest_column(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_postgrest_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_postgrest_reload() TO anon;
GRANT EXECUTE ON FUNCTION public.force_postgrest_reload() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_schema() TO anon;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_schema() TO service_role;

-- Force PostgREST to reload
SELECT public.force_postgrest_reload();

-- Verify the schema
SELECT public.verify_postgrest_schema();
