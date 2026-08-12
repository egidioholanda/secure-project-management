-- ============================================================
-- Pipeline administrativo-financeiro de projetos (10 fases)
-- ============================================================
-- Cada linha registra a CONCLUSÃO de uma fase de um projeto.
-- A "fase atual" é derivada em runtime: a menor fase de 1 a 10
-- que ainda não tem registro. O dono de cada fase (compras,
-- estoque, gestor, cliente, administrativo...) é fixo e vive no
-- frontend, por isso não é persistido aqui.
--
-- O número de conformidade enviado pelo cliente e o número da NF
-- são gravados em `note` da respectiva fase (9 e 10).

CREATE TABLE IF NOT EXISTS public.project_phases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase             smallint    NOT NULL CHECK (phase BETWEEN 1 AND 10),
  completed_at      timestamptz NOT NULL DEFAULT now(),
  completed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by_name text,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

-- Padrão "hardened": policy única FOR ALL com TO authenticated.
-- Sem TO authenticated a tabela ficaria acessível pela anon key.
DROP POLICY IF EXISTS "Authenticated users can manage project_phases" ON public.project_phases;
CREATE POLICY "Authenticated users can manage project_phases"
  ON public.project_phases FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Entra na auditoria genérica do sistema
CREATE TRIGGER trg_audit_project_phases
  AFTER INSERT OR UPDATE OR DELETE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
