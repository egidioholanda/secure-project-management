-- ============================================================
-- Data de fechamento da oportunidade
-- ============================================================
-- O "ganho no mês" usava updated_at, que muda a cada edição: renomear o
-- negócio movia o mês em que ele foi ganho. E negócios fechados antes de
-- entrarem no sistema caíam no mês do cadastro.
--
-- Agora existe uma data própria, preenchida quando o negócio é decidido e
-- corrigível à mão.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS closed_at date;

-- Backfill: para os já decididos, updated_at é a melhor aproximação
-- disponível. Vai ser corrigido à mão onde importar.
UPDATE public.opportunities
SET closed_at = updated_at::date
WHERE closed_at IS NULL
  AND status IN ('ganha', 'perdida');
