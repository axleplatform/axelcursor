-- Enable guest bookings by making user_id nullable and removing foreign key constraint

-- Step 1: Drop the foreign key constraint
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;

-- Step 2: Make user_id nullable (it may already be nullable, but ensure it)
ALTER TABLE public.appointments 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Update RLS policies to better handle guest bookings
-- Drop existing policies that require user_id matching
DROP POLICY IF EXISTS "Allow authenticated users to insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated users to update their appointments" ON public.appointments;

-- Create new policies that allow guest bookings
CREATE POLICY "Allow authenticated users to insert appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (
    -- Authenticated users can only create appointments for themselves
    auth.uid() = user_id
);

CREATE POLICY "Allow authenticated users to update their appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    -- Users can update their own appointments
    auth.uid() = user_id
    -- Or if user_id is null (guest appointment) and they have a valid session
    OR (user_id IS NULL AND auth.uid() IS NOT NULL)
)
WITH CHECK (
    -- Same conditions for the check
    auth.uid() = user_id
    OR (user_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Create a policy for guest users to update appointments they created
-- (This allows linking guest appointments to users later)
CREATE POLICY "Allow users to claim guest appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    -- Allow users to claim guest appointments by setting their user_id
    user_id IS NULL
)
WITH CHECK (
    -- Only allow setting user_id to the authenticated user's ID
    auth.uid() = user_id
);

-- Update anonymous user policies to be more permissive for guest bookings
DROP POLICY IF EXISTS "Allow anonymous users to insert appointments" ON public.appointments;
CREATE POLICY "Allow anonymous users to insert appointments"
ON public.appointments FOR INSERT
TO anon
WITH CHECK (
    -- Anonymous users can create appointments with null user_id (guest bookings)
    user_id IS NULL
);

-- Add a policy to allow anonymous users to update guest appointments
-- (This is useful for multi-step booking flows)
CREATE POLICY "Allow anonymous users to update guest appointments"
ON public.appointments FOR UPDATE
TO anon
USING (
    -- Only allow updating appointments with null user_id
    user_id IS NULL
)
WITH CHECK (
    -- Ensure user_id remains null for anonymous updates
    user_id IS NULL
);

-- Add indexes for performance (user_id can now be null)
CREATE INDEX IF NOT EXISTS idx_appointments_user_id_null ON public.appointments(user_id) 
WHERE user_id IS NULL;

-- Create a function to help with guest appointment management
CREATE OR REPLACE FUNCTION public.convert_guest_to_user_appointment(
    appointment_id UUID,
    new_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Convert a guest appointment to a user appointment
    UPDATE public.appointments
    SET 
        user_id = new_user_id,
        updated_at = now()
    WHERE 
        id = appointment_id
        AND user_id IS NULL;
    
    -- Return true if a row was updated
    RETURN FOUND;
END;
$$;

-- Grant permissions on the new function
GRANT EXECUTE ON FUNCTION public.convert_guest_to_user_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_guest_to_user_appointment TO service_role;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_appointments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_appointments_updated_at();

-- Refresh the schema cache
SELECT public.refresh_schema_cache(); 