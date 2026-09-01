-- ============================================================
-- Nenhuma fase pode nascer sem pedido
-- ============================================================
-- A migration criou `order_id`, mas o frontend em produção só passa a
-- preenchê-lo no próximo deploy. Nessa janela — e em qualquer aba aberta com
-- o JS antigo — cada fase marcada nasce órfã e some do painel sem erro
-- nenhum. Aconteceu: 63 fases marcadas hoje ficaram sem pedido.
--
-- O trigger resolve no banco, que é o único lugar por onde todos os clientes
-- passam, atuais ou desatualizados.

CREATE OR REPLACE FUNCTION public.fill_phase_order_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.order_id IS NULL THEN
    SELECT o.id INTO NEW.order_id
    FROM public.project_orders o
    WHERE o.project_id = NEW.project_id AND o.kind = NEW.track
    -- o pedido ainda não repartido é o destino natural de um cliente que não
    -- conhece modalidade; depois dele, o de maior valor
    ORDER BY (o.category = 'nao_separado') DESC, o.value DESC
    LIMIT 1;

    IF NEW.order_id IS NULL THEN
      RAISE EXCEPTION 'Projeto % não tem pedido de % para receber esta fase',
        NEW.project_id, NEW.track;
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_fill_phase_order_id ON public.project_phases;
CREATE TRIGGER trg_fill_phase_order_id
  BEFORE INSERT ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.fill_phase_order_id();

-- ── Religar as órfãs já criadas ─────────────────────────────
UPDATE public.project_phases f
SET order_id = o.id
FROM public.project_orders o
WHERE f.order_id IS NULL
  AND o.project_id = f.project_id
  AND o.kind = f.track
  AND o.id = (
    SELECT x.id FROM public.project_orders x
    WHERE x.project_id = f.project_id AND x.kind = f.track
    ORDER BY (x.category = 'nao_separado') DESC, x.value DESC
    LIMIT 1
  )
  -- não religar onde já existe a mesma fase no pedido: seria duplicata
  AND NOT EXISTS (
    SELECT 1 FROM public.project_phases g
    WHERE g.order_id = o.id AND g.phase = f.phase
  );

-- o que sobrou órfão é duplicata do que já estava registrado no pedido
DELETE FROM public.project_phases WHERE order_id IS NULL;

ALTER TABLE public.project_phases ALTER COLUMN order_id SET NOT NULL;
