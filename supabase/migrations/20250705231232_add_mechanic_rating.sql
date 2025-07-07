-- Add rating column to mechanic_profiles table
ALTER TABLE mechanic_profiles 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4.0 
CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_rating ON mechanic_profiles(rating DESC);
