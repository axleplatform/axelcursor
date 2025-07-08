-- Add latitude and longitude columns to appointments table
ALTER TABLE appointments 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for potential geographic queries
CREATE INDEX idx_appointments_coordinates ON appointments(latitude, longitude);
