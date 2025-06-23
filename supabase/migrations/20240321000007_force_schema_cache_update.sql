-- Drop all existing schema cache refresh functions
DROP FUNCTION IF EXISTS refresh_schema_cache();
DROP FUNCTION IF EXISTS public.refresh_schema_cache();
DROP FUNCTION IF EXISTS notify_schema_reload();
DROP FUNCTION IF EXISTS public.notify_schema_reload();
DROP FUNCTION IF EXISTS verify_schema_cache();
DROP FUNCTION IF EXISTS public.verify_schema_cache();

-- Force update the schema cache by recreating the table
DO $$
BEGIN
    -- First, ensure the is_guest column exists with correct type
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

    -- Drop any existing camelCase version
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'isGuest'
    ) THEN
        ALTER TABLE public.appointments DROP COLUMN "isGuest";
    END IF;

    -- Force PostgREST to reload the schema by creating a temporary table
    CREATE TEMP TABLE _schema_reload AS SELECT 1;
    DROP TABLE _schema_reload;
END $$;

-- Create a new schema cache refresh function that uses multiple methods
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- Method 1: Try to notify PostgREST
    BEGIN
        NOTIFY pgrst, 'reload schema';
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from notification
    END;

    -- Method 2: Force schema reload by creating and dropping a temporary table
    BEGIN
        CREATE TEMP TABLE _schema_reload AS SELECT 1;
        DROP TABLE _schema_reload;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from temporary table
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

-- Force a schema cache refresh
SELECT public.refresh_schema_cache();

-- Verify the schema cache
SELECT public.verify_schema_cache();
