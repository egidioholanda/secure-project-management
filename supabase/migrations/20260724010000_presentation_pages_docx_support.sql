-- Allow a presentation page to be a Word (.docx) document instead of a single
-- ready-made image. A docx page is rendered into as many PDF pages as needed
-- at proposal-export time (client-side), so image_url is no longer mandatory.
ALTER TABLE public.presentation_pages
  ALTER COLUMN image_url DROP NOT NULL,
  ADD COLUMN source_type text NOT NULL DEFAULT 'image' CHECK (source_type IN ('image', 'docx')),
  ADD COLUMN file_url text,
  ADD CONSTRAINT presentation_pages_source_check CHECK (
    (source_type = 'image' AND image_url IS NOT NULL) OR
    (source_type = 'docx' AND file_url IS NOT NULL)
  );

-- Allow uploading .docx files to the existing presentation-pages bucket
UPDATE storage.buckets SET
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'presentation-pages';
