-- Add any missing columns to mechanic_profiles table to ensure all onboarding data is captured
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'personal_info';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS service_radius INTEGER;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS business_start_year INTEGER;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS is_incorporated BOOLEAN;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS business_structure TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS other_business_description TEXT[];
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS yelp_url TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS google_url TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS other_specialties TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS specialized_cars JSONB DEFAULT '[]';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS least_favorite_brands TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS unwanted_cars TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS unwanted_services TEXT[] DEFAULT '{}';
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure mechanics table has all necessary fields
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS rating DECIMAL;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_user_id ON mechanic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);
