-- Drop our custom functions since we're using Supabase's built-in anonymous auth
DROP FUNCTION IF EXISTS public.create_anonymous_user();
DROP FUNCTION IF EXISTS public.verify_anonymous_user(UUID);

-- Update RLS policies to work with Supabase's anonymous auth
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Drop our custom policy
DROP POLICY IF EXISTS "Allow anonymous user creation" ON auth.users;

-- Create a policy to allow anonymous users to create appointments
CREATE POLICY "Allow anonymous users to create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (
    -- Allow if the user_id matches the authenticated user's ID
    (auth.uid() = user_id)
    OR
    -- Or if it's an anonymous user (starts with 'anon_')
    (user_id::text LIKE 'anon_%')
);

-- Create a policy to allow users to read their own appointments
CREATE POLICY "Allow users to read their own appointments"
ON public.appointments
FOR SELECT
TO anon, authenticated, service_role
USING (
    -- Allow if the user_id matches the authenticated user's ID
    (auth.uid() = user_id)
    OR
    -- Or if it's an anonymous user (starts with 'anon_')
    (user_id::text LIKE 'anon_%')
);

-- Create a policy to allow users to update their own appointments
CREATE POLICY "Allow users to update their own appointments"
ON public.appointments
FOR UPDATE
TO anon, authenticated, service_role
USING (
    -- Allow if the user_id matches the authenticated user's ID
    (auth.uid() = user_id)
    OR
    -- Or if it's an anonymous user (starts with 'anon_')
    (user_id::text LIKE 'anon_%')
)
WITH CHECK (
    -- Allow if the user_id matches the authenticated user's ID
    (auth.uid() = user_id)
    OR
    -- Or if it's an anonymous user (starts with 'anon_')
    (user_id::text LIKE 'anon_%')
);

-- Create a function to handle user account linking
CREATE OR REPLACE FUNCTION public.handle_user_account_linking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If the user is converting from anonymous to authenticated
    IF OLD.raw_user_meta_data->>'is_anonymous' = 'true' 
       AND NEW.raw_user_meta_data->>'is_anonymous' IS NULL THEN
        -- Update all appointments for this user
        UPDATE public.appointments
        SET user_id = NEW.id,
            updated_at = now()
        WHERE user_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create a trigger to handle user account linking
DROP TRIGGER IF EXISTS handle_user_account_linking ON auth.users;
CREATE TRIGGER handle_user_account_linking
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_account_linking();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_user_account_linking() TO service_role; 