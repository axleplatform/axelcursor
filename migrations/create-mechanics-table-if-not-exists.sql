-- Create mechanic_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS mechanic_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  specialties TEXT[],
  experience VARCHAR(255),
  rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_user_id ON mechanic_profiles(user_id);
