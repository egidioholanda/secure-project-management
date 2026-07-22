-- Presentation pages (institutional pages that can be prepended to proposal PDFs)
CREATE TABLE public.presentation_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.presentation_pages ENABLE ROW LEVEL SECURITY;

-- Only admins can manage presentation pages
CREATE POLICY "Admins can manage presentation pages"
ON public.presentation_pages
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Any authenticated user can view them (needed to build proposal PDFs)
CREATE POLICY "Authenticated users can view presentation pages"
ON public.presentation_pages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_presentation_pages_updated_at
BEFORE UPDATE ON public.presentation_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for presentation page images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-pages',
  'presentation-pages',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read presentation-pages"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'presentation-pages');

CREATE POLICY "Admins can upload presentation-pages"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'presentation-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update presentation-pages"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'presentation-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete presentation-pages"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'presentation-pages' AND public.is_admin(auth.uid()));

-- Allow marking a proposal item to be featured in the equipment gallery
ALTER TABLE public.proposal_items
ADD COLUMN featured_in_gallery boolean NOT NULL DEFAULT false;
