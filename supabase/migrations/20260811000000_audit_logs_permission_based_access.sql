-- Allow reading audit_logs to any user whose profile role has been granted
-- the '/auditoria' page permission, not only literal admins.
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id UUID, _page_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.role_page_permissions rpp ON rpp.role_id = p.role_definition_id
    WHERE p.user_id = _user_id
      AND rpp.page_slug = _page_slug
  )
$$;

DROP POLICY IF EXISTS "admins_read_audit_logs" ON public.audit_logs;

CREATE POLICY "authorized_read_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR public.has_page_permission(auth.uid(), '/auditoria')
  );
