-- ============================================================
-- Oportunidades: um negócio = uma oportunidade
-- ============================================================
-- Hoje cada negócio existe em DUAS oportunidades ("X - Produtos" e
-- "X - Serviços"), porque o pedido de produto é faturado antes do de
-- serviço e o modelo só permitia um status por registro. O faturamento
-- passa a viver em project_phases (fase 5 = produto, fase 10 = serviço),
-- e a oportunidade volta a representar o negócio inteiro.
--
-- A ORDEM DAS ETAPAS IMPORTA: auditoria antes de tocar dados, numeric
-- antes de somar. Esta migration é só de ESTRUTURA; a consolidação dos
-- pares existentes é a migration seguinte.

-- ── Etapa 0 · rede de segurança ─────────────────────────────
-- opportunities era a única tabela de negócio fora da auditoria.
-- fn_audit_log() já deriva resource_name de `title` pelo ramo ELSE,
-- então basta o trigger.
DROP TRIGGER IF EXISTS trg_audit_opportunities ON public.opportunities;
CREATE TRIGGER trg_audit_opportunities
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- ── Etapa 1 · dinheiro deixa de ser texto ───────────────────
-- Verificado nos 81 registros antes de rodar: todos no formato BRL
-- "R$ N.NNN,NN", nenhum com letras e nenhum com ponto decimal ambíguo.
CREATE OR REPLACE FUNCTION public.brl_to_numeric(_raw text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
           replace(
             replace(regexp_replace(coalesce(_raw, ''), '[^0-9.,]', '', 'g'), '.', ''),
             ',', '.'
           ),
           ''
         )::numeric
$$;

ALTER TABLE public.opportunities
  ALTER COLUMN product_value TYPE numeric(14,2) USING public.brl_to_numeric(product_value),
  ALTER COLUMN service_value TYPE numeric(14,2) USING public.brl_to_numeric(service_value),
  ALTER COLUMN value         TYPE numeric(14,2) USING public.brl_to_numeric(value),
  ALTER COLUMN monthly_value TYPE numeric(14,2) USING public.brl_to_numeric(monthly_value);

-- `value` é derivado de produto + serviço. Recalcular aqui corrige os
-- centavos que a UI perdia ao gravar o total como texto arredondado.
UPDATE public.opportunities
SET value = coalesce(product_value, 0) + coalesce(service_value, 0)
WHERE product_value IS NOT NULL OR service_value IS NOT NULL;

-- ── Etapa 2 · campos que o novo modelo exige ────────────────
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS expected_close_date date,
  ADD COLUMN IF NOT EXISTS loss_reason text,
  -- soft-delete da consolidação: o registro absorvido não é apagado,
  -- fica apontando para o sobrevivente como trilha de auditoria
  ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_opportunities_archived_at
  ON public.opportunities(archived_at);

-- Projetos passam a carregar o split, porque produto e serviço são
-- faturados em fases diferentes do pipeline de faturamento.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS product_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS service_value numeric(14,2);

-- ── Etapa 3 · novas etapas comerciais ───────────────────────
-- Faturamento sai do funil comercial. Os 4 status de produto/serviço
-- tinham ZERO registros — eram as fases 2, 5 e 10 do Financeiro
-- reimplementadas no Kanban.
UPDATE public.opportunities SET status = 'qualificacao'
  WHERE status = 'prospeccao';
UPDATE public.opportunities SET status = 'negociacao'
  WHERE status IN ('pedido_produto', 'pedido_servico');
-- "Pedido do cliente enviado" É ganhar o negócio: existe documento de
-- compra. Daí para frente a verdade mora em project_phases.
UPDATE public.opportunities SET status = 'ganha'
  WHERE status IN ('pedido_cliente', 'faturado_produto', 'faturado_servico');

-- Trava o vocabulário: sem constraint, o status voltou a acumular
-- valores mortos que só o frontend conhecia.
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_status_check
  CHECK (status IN ('qualificacao', 'proposta', 'negociacao', 'ganha', 'perdida'));
