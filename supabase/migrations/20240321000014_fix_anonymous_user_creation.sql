-- Drop existing function
DROP FUNCTION IF EXISTS public.create_anonymous_user();

-- Create a function to create an anonymous user without requiring auth
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
    
    -- Create an anonymous user in auth.users without requiring authentication
    INSERT INTO auth.users (
        id,
        email,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        role
    )
    VALUES (
        v_anon_id,
        v_anon_id::text || '@anonymous.local',
        '{"provider": "anonymous", "providers": ["anonymous"]}',
        '{"is_anonymous": true}',
        now(),
        now(),
        'anon'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN v_anon_id;
END;
$$;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO anon;
GRANT EXECUTE ON FUNCTION public.create_anonymous_user() TO service_role;

-- Update RLS policies to allow anonymous user creation
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous user creation"
ON auth.users
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (
    id LIKE 'anon_%' AND
    email LIKE '%@anonymous.local' AND
    raw_user_meta_data->>'is_anonymous' = 'true'
);

-- Create a function to verify anonymous user creation
CREATE OR REPLACE FUNCTION public.verify_anonymous_user(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = p_user_id
        AND email LIKE '%@anonymous.local'
        AND raw_user_meta_data->>'is_anonymous' = 'true'
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_anonymous_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_anonymous_user(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_anonymous_user(UUID) TO service_role; 