-- Create storage bucket for media files
-- This bucket will store customer uploaded images, audio, and video files

-- Create the media files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appointment-media',
  'appointment-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the media bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'appointment-media' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to media files
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'appointment-media'
);

-- Allow users to update their own files
CREATE POLICY "Allow user updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'appointment-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Allow user deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'appointment-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
); 