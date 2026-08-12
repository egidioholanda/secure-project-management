-- ============================================================
-- Consolidação dos pares "X - Produtos" / "X - Serviços"
-- ============================================================
-- Junta cada par num único negócio. NADA é apagado: o registro
-- absorvido recebe merged_into_id + archived_at e some das listagens,
-- servindo de trilha de auditoria e caminho de rollback.
--
-- Só entram pares SEGUROS: exatamente 2 registros com o mesmo título
-- normalizado e cliente, e no máximo um dos lados com projeto vinculado.
-- Pares com projeto nos dois lados e grupos com mais de 2 registros
-- ficam de fora, para decisão humana — fundir dois projetos reais por
-- engano é irreversível na prática.

-- ── Helpers ─────────────────────────────────────────────────

-- Remove o sufixo preservando a capitalização original do título
CREATE OR REPLACE FUNCTION public.opp_strip_suffix(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT trim(regexp_replace(
    coalesce(_t, ''),
    '\s*[-–]\s*(produtos?|prdutos?|servi[cç]os?)\s*$',
    '', 'i'
  ))
$fn$;

-- Chave de agrupamento
CREATE OR REPLACE FUNCTION public.opp_base_title(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT lower(public.opp_strip_suffix(_t))
$fn$;

-- Ordem das etapas, para escolher o status mais avançado do par
CREATE OR REPLACE FUNCTION public.opp_stage_rank(_s text)
RETURNS int LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE _s
    WHEN 'qualificacao' THEN 1
    WHEN 'proposta'     THEN 2
    WHEN 'negociacao'   THEN 3
    WHEN 'ganha'        THEN 4
    ELSE 0
  END
$fn$;

-- ── Plano de fusão (fica registrado para auditoria/rollback) ─

CREATE TABLE IF NOT EXISTS public.opportunity_merge_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survivor_id    uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  absorbed_id    uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  survivor_title text,
  absorbed_title text,
  new_title      text,
  new_product    numeric(14,2),
  new_service    numeric(14,2),
  new_status     text,
  merged_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (absorbed_id)
);

ALTER TABLE public.opportunity_merge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read merge log" ON public.opportunity_merge_log;
CREATE POLICY "Authenticated users can read merge log"
  ON public.opportunity_merge_log FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.opportunity_merge_log
  (survivor_id, absorbed_id, survivor_title, absorbed_title, new_title,
   new_product, new_service, new_status)
WITH norm AS (
  SELECT o.id, o.client, o.status, o.product_value, o.service_value,
         o.notes, o.title, o.created_at,
         public.opp_base_title(o.title) AS base,
         (SELECT count(*) FROM public.projects p WHERE p.opportunity_id = o.id) AS proj_count
  FROM public.opportunities o
  WHERE o.archived_at IS NULL
),
grp AS (
  SELECT base, client,
         count(*) AS cnt,
         count(*) FILTER (WHERE proj_count > 0) AS lados_com_proj
  FROM norm GROUP BY base, client
),
pares AS (
  SELECT n.*
  FROM norm n
  JOIN grp g ON g.base = n.base AND g.client = n.client
  WHERE g.cnt = 2 AND g.lados_com_proj <= 1
),
ranked AS (
  SELECT p.*,
         row_number() OVER (
           PARTITION BY base, client
           -- sobrevive quem tem projeto vinculado; empate vai para o mais
           -- antigo, que preserva a medição de ciclo de venda
           ORDER BY (proj_count > 0) DESC, created_at ASC
         ) AS rn
  FROM pares p
)
SELECT
  s.id, a.id, s.title, a.title,
  public.opp_strip_suffix(s.title),
  coalesce(s.product_value, a.product_value),
  coalesce(s.service_value, a.service_value),
  CASE WHEN public.opp_stage_rank(s.status) >= public.opp_stage_rank(a.status)
       THEN s.status ELSE a.status END
FROM ranked s
JOIN ranked a ON a.base = s.base AND a.client = s.client AND a.rn = 2
WHERE s.rn = 1
ON CONFLICT (absorbed_id) DO NOTHING;

-- ── Aplica no sobrevivente ──────────────────────────────────
-- client_group_id fica FORA do UPDATE de propósito: mexer nele dispara
-- os triggers de sincronia com projects/clients em cascata.
UPDATE public.opportunities o
SET product_value = m.new_product,
    service_value = m.new_service,
    value         = coalesce(m.new_product, 0) + coalesce(m.new_service, 0),
    status        = m.new_status,
    title         = m.new_title,
    notes         = concat_ws(
                      E'\n\n',
                      nullif(o.notes, ''),
                      '[Consolidado com "' || m.absorbed_title || '" em ' ||
                        to_char(now(), 'DD/MM/YYYY') || ']'
                    )
FROM public.opportunity_merge_log m
WHERE o.id = m.survivor_id;

-- ── Arquiva o absorvido (soft delete) ───────────────────────
UPDATE public.opportunities o
SET archived_at    = now(),
    merged_into_id = m.survivor_id
FROM public.opportunity_merge_log m
WHERE o.id = m.absorbed_id
  AND o.archived_at IS NULL;

-- ── Backfill do split nos projetos ──────────────────────────
-- O painel de faturamento precisa saber quanto é produto e quanto é
-- serviço: eles são faturados em fases diferentes (5 e 10).
UPDATE public.projects p
SET product_value = o.product_value,
    service_value = o.service_value
FROM public.opportunities o
WHERE p.opportunity_id = o.id
  AND p.product_value IS NULL
  AND p.service_value IS NULL
  AND (o.product_value IS NOT NULL OR o.service_value IS NOT NULL);
