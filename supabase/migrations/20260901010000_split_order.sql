-- ============================================================
-- Dividir um pedido por modalidade
-- ============================================================

-- A unicidade era (project_id, track, phase), do tempo em que existia um
-- pedido de cada tipo por projeto. Agora um projeto pode ter CFTV e Acesso
-- na mesma trilha, cada um com sua fase 3 — e replicar as fases na divisão
-- esbarraria nessa constraint.
ALTER TABLE public.project_phases
  DROP CONSTRAINT IF EXISTS project_phases_project_track_phase_key;
ALTER TABLE public.project_phases
  ADD CONSTRAINT project_phases_order_phase_key UNIQUE (order_id, phase);

/**
 * Reparte um pedido em N pedidos por modalidade.
 *
 * A regra que mantém o dinheiro correto: VALORES PARTICIONAM, FASES REPLICAM.
 * O valor é dividido entre as modalidades (a soma tem que bater com o total),
 * enquanto as fases já registradas são copiadas para cada parte — elas
 * aconteceram de fato para todas as modalidades do projeto.
 *
 * Tudo numa função para ser atômico: uma divisão pela metade deixaria o
 * projeto com valor duplicado ou perdido.
 */
CREATE OR REPLACE FUNCTION public.split_project_order(_order_id uuid, _parts jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _o      public.project_orders%rowtype;
  _sum    numeric;
  _part   jsonb;
  _new_id uuid;
  _bill   int;
BEGIN
  SELECT * INTO _o FROM public.project_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Nunca dividir pedido já faturado: moveria receita entre meses num período
  -- que já foi fechado e reportado.
  _bill := CASE WHEN _o.kind = 'produto' THEN 5 ELSE 7 END;
  IF EXISTS (
    SELECT 1 FROM public.project_phases f
    WHERE f.order_id = _order_id AND f.phase >= _bill
  ) THEN
    RAISE EXCEPTION 'Este pedido já foi faturado e não pode ser dividido';
  END IF;

  SELECT coalesce(sum((p->>'value')::numeric), 0) INTO _sum
  FROM jsonb_array_elements(_parts) p;

  IF abs(_sum - _o.value) > 0.01 THEN
    RAISE EXCEPTION 'A soma das partes (%) não confere com o total do pedido (%)',
      _sum, _o.value;
  END IF;

  FOR _part IN SELECT * FROM jsonb_array_elements(_parts) LOOP
    INSERT INTO public.project_orders (project_id, category, kind, value)
    VALUES (_o.project_id, _part->>'category', _o.kind, (_part->>'value')::numeric)
    -- somar, nunca substituir: substituir descartaria valor silenciosamente
    ON CONFLICT (project_id, category, kind)
      DO UPDATE SET value = public.project_orders.value + EXCLUDED.value
    RETURNING id INTO _new_id;

    INSERT INTO public.project_phases
      (order_id, project_id, track, phase, completed_at, completed_by,
       completed_by_name, note)
    SELECT _new_id, f.project_id, f.track, f.phase, f.completed_at,
           f.completed_by, f.completed_by_name, f.note
    FROM public.project_phases f
    WHERE f.order_id = _order_id
    ON CONFLICT (order_id, phase) DO NOTHING;
  END LOOP;

  -- remove o pedido original (as fases dele caem por cascade)
  DELETE FROM public.project_orders WHERE id = _order_id;
END
$fn$;

REVOKE ALL ON FUNCTION public.split_project_order(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.split_project_order(uuid, jsonb) TO authenticated;
