-- Allow all authenticated users to read active AI settings
-- This enables a company-wide shared key configured by admin

-- Add read policy for active settings (non-owners can use the active key)
CREATE POLICY "ai_settings_read_active"
  ON public.ai_settings
  FOR SELECT
  USING (active = true AND auth.role() = 'authenticated');
