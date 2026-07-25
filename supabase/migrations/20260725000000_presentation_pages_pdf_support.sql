-- Allow a presentation page to be a ready-made PDF (exported from Word using
-- Word's own renderer), for perfect visual fidelity on design-heavy pages that
-- mammoth.js can't reproduce (text boxes, background shapes, columns, etc.).
-- Reuses the file_url column already added for docx pages.
ALTER TABLE public.presentation_pages
  DROP CONSTRAINT presentation_pages_source_check,
  DROP CONSTRAINT presentation_pages_source_type_check,
  ADD CONSTRAINT presentation_pages_source_type_check CHECK (source_type IN ('image', 'docx', 'pdf')),
  ADD CONSTRAINT presentation_pages_source_check CHECK (
    (source_type = 'image' AND image_url IS NOT NULL) OR
    (source_type IN ('docx', 'pdf') AND file_url IS NOT NULL)
  );

UPDATE storage.buckets SET
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ]
WHERE id = 'presentation-pages';
