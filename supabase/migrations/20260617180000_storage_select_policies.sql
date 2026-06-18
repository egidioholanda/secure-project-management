-- ============================================================================
-- Storage SELECT policies were missing for all buckets.
-- Without a SELECT policy, createSignedUrl and direct downloads both fail
-- for authenticated users on private buckets.
-- ============================================================================

-- floor-plans: authenticated read + make bucket public for client-facing proposals
CREATE POLICY "Authenticated users can read floor-plans"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'floor-plans');

-- Also allow public (anon) read so proposal PDFs embedded in client emails work
CREATE POLICY "Public can read floor-plans"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'floor-plans');

-- device-images: authenticated read (displayed in catalog)
CREATE POLICY "Authenticated users can read device-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'device-images');

-- company-logos: authenticated read (displayed in header/reports)
CREATE POLICY "Authenticated users can read company-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');

-- maintenance-files: authenticated read (displayed in maintenance orders)
CREATE POLICY "Authenticated users can read maintenance-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'maintenance-files');

-- project-documents: authenticated read (displayed in project detail)
CREATE POLICY "Authenticated users can read project-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');
