-- ============================================================================
-- Security hardening: close public (no-auth) access left over from early
-- development, and enforce server-side file size/type limits on storage.
-- ============================================================================

-- 1) device_categories, devices, project_floor_plans, floor_plan_devices,
--    proposals, proposal_items had RLS enabled but with USING(true)/CHECK(true)
--    and no `TO authenticated` clause — readable/writable by anyone with the
--    public anon key, without logging in. Restrict to authenticated users,
--    matching the pattern already used by projects/clients/etc.

DROP POLICY IF EXISTS "Allow all for device_categories" ON public.device_categories;
CREATE POLICY "Authenticated users can manage device_categories"
  ON public.device_categories FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all for devices" ON public.devices;
CREATE POLICY "Authenticated users can manage devices"
  ON public.devices FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all for project_floor_plans" ON public.project_floor_plans;
CREATE POLICY "Authenticated users can manage project_floor_plans"
  ON public.project_floor_plans FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all for floor_plan_devices" ON public.floor_plan_devices;
CREATE POLICY "Authenticated users can manage floor_plan_devices"
  ON public.floor_plan_devices FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all for proposals" ON public.proposals;
CREATE POLICY "Authenticated users can manage proposals"
  ON public.proposals FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all for proposal_items" ON public.proposal_items;
CREATE POLICY "Authenticated users can manage proposal_items"
  ON public.proposal_items FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- 2) The "floor-plans" storage bucket allowed INSERT/UPDATE/DELETE with no
--    auth check at all (any anonymous visitor could upload/overwrite/delete
--    files). Keep public read (floor plans are embedded in client-facing
--    proposal PDFs) but require authentication to write.

DROP POLICY IF EXISTS "Allow public insert floor-plans" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update floor-plans" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete floor-plans" ON storage.objects;

CREATE POLICY "Authenticated users can upload floor-plans"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'floor-plans');

CREATE POLICY "Authenticated users can update floor-plans"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'floor-plans');

CREATE POLICY "Authenticated users can delete floor-plans"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'floor-plans');


-- 3) Server-side file size/type limits on storage buckets. Client-side
--    checks (DeviceImageUpload, ProjectDocumentsSection) can be bypassed by
--    calling the Storage API directly, so the limits must also live here.

UPDATE storage.buckets SET
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'application/pdf']
WHERE id = 'floor-plans';

UPDATE storage.buckets SET
  file_size_limit = 5242880, -- 5MB, matches DeviceImageUpload client check
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'device-images';

UPDATE storage.buckets SET
  file_size_limit = 2097152, -- 2MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
WHERE id = 'company-logos';

UPDATE storage.buckets SET
  file_size_limit = 10485760, -- 10MB per photo
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'maintenance-files';

UPDATE storage.buckets SET
  file_size_limit = 20971520, -- 20MB, matches ProjectDocumentsSection client check
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'project-documents';
