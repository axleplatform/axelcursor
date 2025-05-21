-- Add columns for bio, vehicle information, and profile image
DO $$ 
BEGIN
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'bio') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN bio TEXT;
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'vehicle_year') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN vehicle_year INTEGER;
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'vehicle_make') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN vehicle_make TEXT;
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'vehicle_model') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN vehicle_model TEXT;
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'license_plate') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN license_plate TEXT;
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mechanic_profiles' 
               AND column_name = 'profile_image_url') THEN
    ALTER TABLE mechanic_profiles ADD COLUMN profile_image_url TEXT;
END IF;
END $$;
