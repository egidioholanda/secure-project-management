-- Add image_url column to devices table
ALTER TABLE public.devices
ADD COLUMN image_url text;

-- Create storage bucket for device images
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-images', 'device-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for device images
CREATE POLICY "Device images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'device-images');

CREATE POLICY "Authenticated users can upload device images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update device images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete device images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);