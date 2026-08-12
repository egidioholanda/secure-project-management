-- ============================================================
-- Faturamento em duas trilhas: produto e serviço
-- ============================================================
-- Todo projeto tem dois pedidos, enviados em momentos diferentes e
-- faturados separadamente. Uma fila única de 10 fases obrigava os dois a
-- compartilharem o mesmo relógio: um projeto com o material entregue e a
-- obra nem começada aparecia como "fase 6", escondendo que o pedido de
-- serviço sequer tinha saído.
--
-- Agora cada trilha corre por conta própria, com seu próprio pedido, seu
-- próprio atraso e sua própria nota fiscal:
--   PRODUTO (5): pedido → fechado → compra → estoque → entregue + NF
--   SERVIÇO (7): pedido → fechado → obra → aceite → aval → conformidade → NF

ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'produto';

-- As constraints antigas assumiam fase única por projeto
ALTER TABLE public.project_phases
  DROP CONSTRAINT IF EXISTS project_phases_project_id_phase_key;
ALTER TABLE public.project_phases
  DROP CONSTRAINT IF EXISTS project_phases_phase_check;

-- ── Migração das marcações existentes ───────────────────────
-- As fases 1 e 2 (pedido recebido / pedido fechado) eram comuns: viram o
-- ponto de partida das DUAS trilhas. Copiar antes de renumerar.
INSERT INTO public.project_phases
  (project_id, phase, track, completed_at, completed_by, completed_by_name, note)
SELECT project_id, phase, 'servico', completed_at, completed_by, completed_by_name, note
FROM public.project_phases
WHERE phase IN (1, 2) AND track = 'produto';

-- 6→3 obra · 7→4 aceite · 8→5 aval · 9→6 conformidade · 10→7 NF de serviço
UPDATE public.project_phases
SET track = 'servico', phase = phase - 3
WHERE phase BETWEEN 6 AND 10 AND track = 'produto';

-- 3, 4 e 5 seguem sendo produto com o mesmo número (compra, estoque, entrega)

ALTER TABLE public.project_phases
  ADD CONSTRAINT project_phases_track_check CHECK (track IN ('produto', 'servico'));
ALTER TABLE public.project_phases
  ADD CONSTRAINT project_phases_phase_check CHECK (phase BETWEEN 1 AND 7);
ALTER TABLE public.project_phases
  ADD CONSTRAINT project_phases_project_track_phase_key UNIQUE (project_id, track, phase);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_track
  ON public.project_phases(project_id, track);
