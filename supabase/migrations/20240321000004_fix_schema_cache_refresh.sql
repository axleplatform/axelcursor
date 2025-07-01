-- Drop existing schema cache refresh function if it exists
DROP FUNCTION IF EXISTS refresh_schema_cache();
DROP FUNCTION IF EXISTS public.refresh_schema_cache();

-- Create a function to refresh schema cache with proper permissions
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
    
    -- Wait a moment for the cache to refresh
    PERFORM pg_sleep(1);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO service_role;

-- Create a simpler function that just notifies PostgREST
CREATE OR REPLACE FUNCTION public.notify_schema_reload()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.notify_schema_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_schema_reload() TO anon;
GRANT EXECUTE ON FUNCTION public.notify_schema_reload() TO service_role;

-- Verify functions exist
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_schema_cache', 'notify_schema_reload');
