
CREATE POLICY "Authenticated users can view project document files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can upload project document files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can update project document files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can delete project document files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-documents');
