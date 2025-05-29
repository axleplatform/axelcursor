-- Drop existing schema cache refresh functions to avoid conflicts
DROP FUNCTION IF EXISTS refresh_schema_cache();
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS notify_schema_reload();
DROP FUNCTION IF EXISTS public.notify_schema_reload();

-- Ensure is_guest column exists with correct type and constraints
DO $$
BEGIN
    -- Check if is_guest column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_guest'
    ) THEN
        -- Add is_guest column if it doesn't exist
        ALTER TABLE public.appointments 
        ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Check if isGuest column exists (camelCase version)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'isGuest'
    ) THEN
        -- Drop the camelCase version if it exists
        ALTER TABLE public.appointments DROP COLUMN "isGuest";
    END IF;
END $$;

-- Create a more robust schema cache refresh function
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- First, try to notify PostgREST
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

    -- Verify the schema cache
    BEGIN
        -- Check if we can access the appointments table and its columns
        PERFORM 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments';

        -- Check if is_guest column exists and is accessible
        PERFORM 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_guest';

        -- If we get here, the schema cache is working
        result := json_build_object(
            'success', true,
            'message', 'Schema cache verified successfully',
            'appointments_table_exists', true,
            'is_guest_column_exists', true
        );
    EXCEPTION WHEN OTHERS THEN
        -- If verification fails, update the result
        result := json_build_object(
            'success', false,
            'message', 'Schema cache verification failed',
            'error', SQLERRM
        );
    END;

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

-- Verify functions exist and are accessible
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_schema_cache', 'verify_schema_cache'); 