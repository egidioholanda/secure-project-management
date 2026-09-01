-- ============================================================
-- O pedido faturável vira uma entidade
-- ============================================================
-- Até aqui todo projeto tinha exatamente um pedido de produto e um de
-- serviço, implícitos em product_value/service_value. Mas um projeto com
-- CFTV e Controle de Acesso tem pedidos separados por modalidade, faturados
-- em momentos diferentes ("fatura o CFTV e deixa o acesso pra depois").
--
-- Agora cada pedido é uma linha em project_orders, e as fases pertencem ao
-- pedido, não ao projeto. Esta migration é um REFACTOR: nenhum pedido é
-- dividido aqui. Os multi-modalidade entram como `nao_separado`, para que a
-- divisão seja uma decisão humana e explícita depois.

-- ── Categorias ──────────────────────────────────────────────
-- Slug estável como chave, label editável à parte. O nome da modalidade
-- passa a fazer parte de uma chave financeira: renomear "Controle de Acesso"
-- não pode virar migração de dados, e "controle de acesso" com caixa
-- diferente não pode criar um segundo pedido fantasma.
CREATE TABLE IF NOT EXISTS public.billing_categories (
  slug       text PRIMARY KEY,
  label      text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO public.billing_categories (slug, label, active, sort_order) VALUES
  ('cftv',          'CFTV',                true,  1),
  ('acesso',        'Controle de Acesso',  true,  2),
  ('alarme',        'Alarme Perimetral',   true,  3),
  ('automacao',     'Automação',           true,  4),
  ('integrado',     'Sistema Integrado',   true,  5),
  -- sentinela: pedido herdado que ainda não foi repartido por modalidade.
  -- Não é NULL de propósito: em Postgres NULLs são distintos entre si, então
  -- o UNIQUE deixaria passar dois "não separados" no mesmo projeto.
  ('nao_separado',  'Não separado',        false, 99)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.billing_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_billing_categories" ON public.billing_categories;
CREATE POLICY "auth_read_billing_categories"
  ON public.billing_categories FOR SELECT TO authenticated USING (true);

-- ── Pedidos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_orders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category   text NOT NULL REFERENCES public.billing_categories(slug),
  kind       text NOT NULL CHECK (kind IN ('produto', 'servico')),
  value      numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, category, kind)
);

CREATE INDEX IF NOT EXISTS idx_project_orders_project ON public.project_orders(project_id);

ALTER TABLE public.project_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage project_orders" ON public.project_orders;
CREATE POLICY "Authenticated users can manage project_orders"
  ON public.project_orders FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_project_orders_updated_at
  BEFORE UPDATE ON public.project_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_audit_project_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.project_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- ── Popular a partir do modelo antigo ───────────────────────
-- Categoria: se o projeto tem UMA modalidade, ela é determinística.
-- Duas ou mais → nao_separado, sem inventar rateio.
CREATE OR REPLACE FUNCTION public.category_slug(_label text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN _label ILIKE '%cftv%'      THEN 'cftv'
    WHEN _label ILIKE '%acesso%'    THEN 'acesso'
    WHEN _label ILIKE '%alarme%'    THEN 'alarme'
    WHEN _label ILIKE '%automa%'    THEN 'automacao'
    WHEN _label ILIKE '%integrad%'  THEN 'integrado'
    ELSE NULL
  END
$fn$;

WITH base AS (
  SELECT
    p.id,
    CASE
      WHEN array_length(string_to_array(coalesce(p.type, ''), ','), 1) = 1
        THEN coalesce(public.category_slug(btrim(p.type)), 'nao_separado')
      ELSE 'nao_separado'
    END AS category,
    -- O fallback legado de trackValue(): projeto sem split conta o total como
    -- produto. Ignorar isso zeraria esses pedidos silenciosamente.
    CASE
      WHEN p.product_value IS NULL AND p.service_value IS NULL
        THEN coalesce(p.value, 0)
      ELSE coalesce(p.product_value, 0)
    END AS prod,
    coalesce(p.service_value, 0) AS serv,
    EXISTS (SELECT 1 FROM public.project_phases f
            WHERE f.project_id = p.id AND f.track = 'produto') AS has_prod_phases,
    EXISTS (SELECT 1 FROM public.project_phases f
            WHERE f.project_id = p.id AND f.track = 'servico') AS has_serv_phases
  FROM public.projects p
)
INSERT INTO public.project_orders (project_id, category, kind, value)
-- Cria o pedido quando há valor OU quando já existem fases marcadas: uma fase
-- sem pedido ficaria órfã no backfill abaixo.
SELECT id, category, 'produto', prod FROM base WHERE prod > 0 OR has_prod_phases
UNION ALL
SELECT id, category, 'servico', serv FROM base WHERE serv > 0 OR has_serv_phases
ON CONFLICT (project_id, category, kind) DO NOTHING;

-- ── Fases passam a pertencer ao pedido ──────────────────────
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.project_orders(id) ON DELETE CASCADE;

UPDATE public.project_phases f
SET order_id = o.id
FROM public.project_orders o
WHERE o.project_id = f.project_id
  AND o.kind = f.track
  AND f.order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_phases_order ON public.project_phases(order_id);

-- project_id/track continuam por um release como rede de segurança para
-- reverter sem restaurar backup. O código deixa de lê-los.

-- ── Agregados viram derivados ───────────────────────────────
-- Duas fontes graváveis para o mesmo valor é como o Financeiro e o Comercial
-- passam a discordar sobre faturamento.
CREATE OR REPLACE FUNCTION public.sync_project_values()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _project uuid := coalesce(NEW.project_id, OLD.project_id);
BEGIN
  UPDATE public.projects p
  SET product_value = sub.prod,
      service_value = sub.serv,
      value         = sub.prod + sub.serv
  FROM (
    SELECT
      coalesce(sum(value) FILTER (WHERE kind = 'produto'), 0) AS prod,
      coalesce(sum(value) FILTER (WHERE kind = 'servico'), 0) AS serv
    FROM public.project_orders WHERE project_id = _project
  ) sub
  WHERE p.id = _project;
  RETURN NULL;
END
$fn$;

CREATE TRIGGER trg_sync_project_values
  AFTER INSERT OR UPDATE OR DELETE ON public.project_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_values();
