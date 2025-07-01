-- CRITICAL FIX: Allow guest users to view quotes on pick-mechanic page
-- 
-- BUG: Customers cannot see mechanic quotes because RLS policy only allows authenticated users
-- SOLUTION: Add policy for anonymous users to view quotes for appointments
--
-- This migration fixes the broken booking flow where:
-- 1. Mechanic creates quote ✅
-- 2. Customer visits pick-mechanic page as guest ❌ (blocked by RLS)
-- 3. Customer should see quotes to complete booking ✅ (after this fix)

-- Drop the policy if it already exists
DROP POLICY IF EXISTS "Anonymous can view quotes for appointments" ON public.mechanic_quotes;

-- CRITICAL FIX: Allow anonymous users to view quotes for appointments
-- This enables the guest booking flow where customers access pick-mechanic page via URL
CREATE POLICY "Anonymous can view quotes for appointments" 
ON public.mechanic_quotes 
FOR SELECT 
TO anon 
USING (
    EXISTS (
        SELECT 1 FROM public.appointments 
        WHERE appointments.id = mechanic_quotes.appointment_id
    )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'mechanic_quotes' 
AND policyname = 'Anonymous can view quotes for appointments';
