-- Add review_count column to mechanic_profiles table
ALTER TABLE mechanic_profiles 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0 
CONSTRAINT review_count_non_negative CHECK (review_count >= 0);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_review_count ON mechanic_profiles(review_count DESC);
