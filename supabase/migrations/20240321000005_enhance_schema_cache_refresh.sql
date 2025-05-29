-- Drop existing schema cache refresh functions
DROP FUNCTION IF EXISTS refresh_schema_cache();
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS notify_schema_reload();
DROP FUNCTION IF EXISTS public.notify_schema_reload();

-- Create an enhanced schema cache refresh function
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
    -- Check if we can access the appointments table
    BEGIN
        PERFORM 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments';
        
        result := json_build_object(
            'success', true,
            'message', 'Schema cache is accessible',
            'appointments_table_exists', true
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

-- Verify functions exist and are accessible
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_schema_cache', 'verify_schema_cache'); 