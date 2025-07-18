-- Add media files support to appointments table
-- This allows storing customer uploaded images, audio, and video files

-- Add media files column to store file URLs and metadata
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS media_files JSONB DEFAULT '[]'::jsonb;

-- Add AI analysis results column to store Gemini recommendations
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS ai_analysis_results JSONB DEFAULT NULL;

-- Add index for media files queries
CREATE INDEX IF NOT EXISTS idx_appointments_media_files 
ON appointments USING GIN (media_files);

-- Add index for AI analysis results
CREATE INDEX IF NOT EXISTS idx_appointments_ai_analysis 
ON appointments USING GIN (ai_analysis_results);

-- Add comment for documentation
COMMENT ON COLUMN appointments.media_files IS 'Array of media file objects with type, url, name, and size';
COMMENT ON COLUMN appointments.ai_analysis_results IS 'Gemini AI analysis results with service recommendations'; 