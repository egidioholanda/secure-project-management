-- ============================================================
-- Tabela de auditoria
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text,
  user_name     text,
  action        text        NOT NULL,
  resource_type text        NOT NULL,
  resource_id   text,
  resource_name text,
  old_values    jsonb,
  new_values    jsonb,
  metadata      jsonb
);

CREATE INDEX idx_audit_logs_created_at    ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id       ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_action        ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler
CREATE POLICY "admins_read_audit_logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Triggers e RPC (SECURITY DEFINER) podem inserir
CREATE POLICY "all_insert_audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Função de trigger genérica
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action        text;
  v_new_row       jsonb;
  v_old_row       jsonb;
  v_resource_id   text;
  v_resource_name text;
  v_user_email    text;
  v_user_name     text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'CREATE';
    v_new_row := to_jsonb(NEW);
    v_old_row := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_row := to_jsonb(OLD);
    v_new_row := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'profiles' THEN
      IF (v_new_row->>'approval_status') = 'approved' THEN
        v_action := 'APPROVE';
      ELSIF (v_new_row->>'approval_status') = 'rejected' THEN
        v_action := 'REJECT';
      ELSE
        v_action := 'UPDATE';
      END IF;
    ELSE
      v_action := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'DELETE';
    v_old_row := to_jsonb(OLD);
    v_new_row := NULL;
  END IF;

  -- Resource ID: tenta id, depois user_id
  v_resource_id := COALESCE(
    v_new_row->>'id',
    v_old_row->>'id',
    v_new_row->>'user_id',
    v_old_row->>'user_id'
  );

  -- Resource name por tabela
  CASE TG_TABLE_NAME
    WHEN 'maintenance_contracts', 'maintenance_orders' THEN
      v_resource_name := COALESCE(
        v_new_row->>'title', v_old_row->>'title'
      );
    WHEN 'user_roles' THEN
      v_resource_name := COALESCE(
        v_new_row->>'role', v_old_row->>'role'
      );
      v_resource_id := COALESCE(
        v_new_row->>'user_id', v_old_row->>'user_id'
      );
    ELSE
      v_resource_name := COALESCE(
        v_new_row->>'name',      v_old_row->>'name',
        v_new_row->>'full_name', v_old_row->>'full_name',
        v_new_row->>'title',     v_old_row->>'title'
      );
  END CASE;

  -- Dados do ator (quem realizou a ação)
  SELECT p.email, p.full_name
  INTO v_user_email, v_user_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name,
    action, resource_type, resource_id, resource_name,
    old_values, new_values
  ) VALUES (
    auth.uid(), v_user_email, v_user_name,
    v_action, TG_TABLE_NAME,
    v_resource_id, v_resource_name,
    v_old_row, v_new_row
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- Função RPC para eventos manuais (login, logout, etc.)
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action        text,
  p_resource_type text,
  p_resource_id   text  DEFAULT NULL,
  p_resource_name text  DEFAULT NULL,
  p_metadata      jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_user_name  text;
BEGIN
  SELECT p.email, p.full_name
  INTO v_user_email, v_user_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name,
    action, resource_type, resource_id, resource_name,
    metadata
  ) VALUES (
    auth.uid(), v_user_email, v_user_name,
    p_action, p_resource_type, p_resource_id, p_resource_name,
    p_metadata
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- ============================================================
-- Triggers nas tabelas auditáveis
-- ============================================================

CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_maintenance_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_maintenance_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_schedule_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- Só loga mudança de status de aprovação
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION public.fn_audit_log();

-- Atribuição e remoção de funções (roles)
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
