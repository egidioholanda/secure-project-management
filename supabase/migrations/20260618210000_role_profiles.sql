-- Create role_definitions table
CREATE TABLE IF NOT EXISTS public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create role_page_permissions table
CREATE TABLE IF NOT EXISTS public.role_page_permissions (
  role_id UUID NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  PRIMARY KEY (role_id, page_slug)
);

-- Add role_definition_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_definition_id UUID REFERENCES public.role_definitions(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read role definitions
CREATE POLICY "auth_read_role_definitions"
  ON public.role_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_role_page_permissions"
  ON public.role_page_permissions FOR SELECT TO authenticated USING (true);

-- Only admins can write role definitions
CREATE POLICY "admin_write_role_definitions"
  ON public.role_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_write_role_page_permissions"
  ON public.role_page_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed system role definitions with fixed UUIDs
INSERT INTO public.role_definitions (id, name, description, is_system) VALUES
  ('00000000-0000-0000-0001-000000000000'::uuid, 'Administrador', 'Acesso total ao sistema', true),
  ('00000000-0000-0000-0002-000000000000'::uuid, 'Gerente', 'Acesso gerencial completo', true),
  ('00000000-0000-0000-0003-000000000000'::uuid, 'Usuário', 'Acesso padrão ao sistema', true),
  ('00000000-0000-0000-0004-000000000000'::uuid, 'Suporte Técnico', 'Acesso operacional', true)
ON CONFLICT (name) DO NOTHING;

-- Page permissions: Administrador (all pages)
INSERT INTO public.role_page_permissions (role_id, page_slug)
SELECT '00000000-0000-0000-0001-000000000000'::uuid, slug
FROM unnest(ARRAY[
  '/dashboard/operacional', '/dashboard/comercial', '/oportunidades',
  '/projetos', '/mapa', '/catalogo', '/cronogramas', '/relatorios',
  '/clientes', '/equipes', '/usuarios', '/configuracoes'
]) AS t(slug)
ON CONFLICT DO NOTHING;

-- Page permissions: Gerente (all pages)
INSERT INTO public.role_page_permissions (role_id, page_slug)
SELECT '00000000-0000-0000-0002-000000000000'::uuid, slug
FROM unnest(ARRAY[
  '/dashboard/operacional', '/dashboard/comercial', '/oportunidades',
  '/projetos', '/mapa', '/catalogo', '/cronogramas', '/relatorios',
  '/clientes', '/equipes', '/usuarios', '/configuracoes'
]) AS t(slug)
ON CONFLICT DO NOTHING;

-- Page permissions: Usuário (sem acesso a usuarios e configuracoes)
INSERT INTO public.role_page_permissions (role_id, page_slug)
SELECT '00000000-0000-0000-0003-000000000000'::uuid, slug
FROM unnest(ARRAY[
  '/dashboard/operacional', '/dashboard/comercial', '/oportunidades',
  '/projetos', '/mapa', '/catalogo', '/cronogramas', '/relatorios',
  '/clientes', '/equipes'
]) AS t(slug)
ON CONFLICT DO NOTHING;

-- Page permissions: Suporte Técnico (operacional apenas)
INSERT INTO public.role_page_permissions (role_id, page_slug)
SELECT '00000000-0000-0000-0004-000000000000'::uuid, slug
FROM unnest(ARRAY[
  '/dashboard/operacional', '/projetos', '/mapa', '/catalogo',
  '/cronogramas', '/relatorios', '/clientes', '/equipes'
]) AS t(slug)
ON CONFLICT DO NOTHING;

-- Backfill existing users based on their current app_role
UPDATE public.profiles p
SET role_definition_id = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  ) THEN '00000000-0000-0000-0001-000000000000'::uuid
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'manager'
  ) THEN '00000000-0000-0000-0002-000000000000'::uuid
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'sup_tecnico'
  ) THEN '00000000-0000-0000-0004-000000000000'::uuid
  ELSE '00000000-0000-0000-0003-000000000000'::uuid
END
WHERE role_definition_id IS NULL;
