-- 1. Tabela de grupos de clientes
CREATE TABLE IF NOT EXISTS public.client_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client_groups"
  ON public.client_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage client_groups"
  ON public.client_groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. Grupo padrão "Geral"
INSERT INTO public.client_groups (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Geral', 'Grupo padrão de clientes')
ON CONFLICT (id) DO NOTHING;

-- 3. Adicionar client_group_id na tabela clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_group_id uuid REFERENCES public.client_groups(id) ON DELETE SET NULL;

UPDATE public.clients
SET client_group_id = '00000000-0000-0000-0000-000000000001'
WHERE client_group_id IS NULL;

-- 4. Tabela de permissões: qual role vê qual grupo
CREATE TABLE IF NOT EXISTS public.role_client_group_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  client_group_id uuid NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, client_group_id)
);

ALTER TABLE public.role_client_group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_client_group_permissions"
  ON public.role_client_group_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage role_client_group_permissions"
  ON public.role_client_group_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Dar acesso ao grupo "Geral" para todos os roles existentes
INSERT INTO public.role_client_group_permissions (role_id, client_group_id)
SELECT id, '00000000-0000-0000-0000-000000000001'
FROM public.role_definitions
ON CONFLICT DO NOTHING;
