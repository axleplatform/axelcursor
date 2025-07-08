-- Allow customers to create appointment updates when they book appointments
CREATE POLICY "Customers can create appointment updates" 
ON appointment_updates 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Check if the user is the customer who created the appointment
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = appointment_updates.appointment_id 
    AND appointments.customer_id = auth.uid()
  )
);

-- Allow mechanics to read appointment updates for their appointments
CREATE POLICY "Mechanics can read their appointment updates" 
ON appointment_updates 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = appointment_updates.appointment_id 
    AND appointments.mechanic_id = auth.uid()
  )
);
