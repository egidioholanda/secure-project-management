-- ============================================================
-- Trilhas de faturamento: produto ganha conformidade + NF,
-- serviço separa emissão da nota da anexação no portal
-- ============================================================
--   PRODUTO (7): pedido → fechado → compra → estoque → entregue
--                → nº de conformidade → NF no portal
--   SERVIÇO (8): pedido → fechado → obra → aceite → aval
--                → nº de conformidade → NF faturada → NF no portal

ALTER TABLE public.project_phases
  DROP CONSTRAINT IF EXISTS project_phases_phase_check;
ALTER TABLE public.project_phases
  ADD CONSTRAINT project_phases_phase_check CHECK (phase BETWEEN 1 AND 8);

-- ── Marcações existentes ────────────────────────────────────
-- Na trilha de SERVIÇO a antiga fase 7 chamava-se "NF no portal": quem a
-- marcou já emitiu a nota E anexou. O ato registrado é o da nova fase 8, e
-- a emissão (nova 7) necessariamente aconteceu antes — então herda as duas.
INSERT INTO public.project_phases
  (project_id, phase, track, completed_at, completed_by, completed_by_name, note)
SELECT project_id, 8, 'servico', completed_at, completed_by, completed_by_name, note
FROM public.project_phases
WHERE track = 'servico' AND phase = 7
ON CONFLICT (project_id, track, phase) DO NOTHING;

-- Na trilha de PRODUTO a fase 5 ("material faturado e entregue à equipe")
-- é entrega interna, não nota ao cliente — as fases 6 e 7 são etapas novas
-- que ninguém marcou ainda. Nada a herdar aqui, de propósito.
