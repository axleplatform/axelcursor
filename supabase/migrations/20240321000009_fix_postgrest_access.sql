-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for all users" ON public.appointments;

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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Method 1: Notify PostgREST
    NOTIFY pgrst, 'reload schema';
    
    -- Method 2: Create and drop a temporary table
    CREATE TEMP TABLE _schema_reload AS SELECT 1;
    DROP TABLE _schema_reload;
    
    -- Method 3: Force a schema change by adding and removing a comment
    COMMENT ON TABLE public.appointments IS 'Schema reload trigger';
    COMMENT ON TABLE public.appointments IS NULL;
END;
$$;

-- Create a function to verify PostgREST access
CREATE OR REPLACE FUNCTION public.verify_postgrest_access()
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
        -- Verify appointments table exists and is accessible
        PERFORM 1 FROM public.appointments LIMIT 1;
        
        -- Verify is_guest column exists and is accessible
        PERFORM is_guest FROM public.appointments LIMIT 1;
        
        result := json_build_object(
            'success', true,
            'message', 'PostgREST access verified successfully',
            'appointments_table_accessible', true,
            'is_guest_column_accessible', true
        );
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Failed to verify PostgREST access',
            'error', SQLERRM
        );
    END;

    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO anon;
GRANT EXECUTE ON FUNCTION public.force_schema_reload() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_access() TO anon;
GRANT EXECUTE ON FUNCTION public.verify_postgrest_access() TO service_role;

-- Grant table permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Force a schema reload
SELECT public.force_schema_reload();

-- Verify PostgREST access
SELECT public.verify_postgrest_access();

-- Add a comment to the is_guest column to ensure it's recognized
COMMENT ON COLUMN public.appointments.is_guest IS 'Indicates if the appointment is for a guest user';

-- Create an index on is_guest to ensure it's properly recognized
CREATE INDEX IF NOT EXISTS idx_appointments_is_guest ON public.appointments(is_guest); 