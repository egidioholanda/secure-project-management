-- Make the floor-plans bucket public so getPublicUrl URLs work for direct browser
-- access (client proposals, react-pdf fetch fallback, img src fallback).
-- Write access remains restricted to authenticated users via the RLS policies
-- added in migration 20260616165918.
UPDATE storage.buckets SET public = true WHERE id = 'floor-plans';
