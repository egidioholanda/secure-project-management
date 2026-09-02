-- ============================================================
-- Corrigir o valor de um pedido
-- ============================================================
-- Um valor digitado errado na oportunidade era copiado para o projeto na
-- conversão e ficava sem conserto: o painel financeiro não editava valor, e
-- corrigir na oportunidade não propagava. Sobrava um aviso de divergência
-- que ninguém podia resolver.
--
-- A correção acontece no pedido, que é onde o faturamento acontece, e
-- opcionalmente volta para a oportunidade — porque quando o erro é de
-- digitação na origem, os dois lados estão errados.

CREATE OR REPLACE FUNCTION public.update_order_value(
  _order_id         uuid,
  _value            numeric,
  _sync_opportunity boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _o     public.project_orders%rowtype;
  _opp   uuid;
  _total numeric;
BEGIN
  IF _value IS NULL OR _value < 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  SELECT * INTO _o FROM public.project_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  UPDATE public.project_orders SET value = _value WHERE id = _order_id;

  IF _sync_opportunity THEN
    SELECT opportunity_id INTO _opp FROM public.projects WHERE id = _o.project_id;

    IF _opp IS NOT NULL THEN
      -- A oportunidade guarda um valor por natureza, enquanto o projeto pode
      -- ter vários pedidos de material (um por modalidade): o que volta para
      -- ela é a SOMA, não o valor deste pedido.
      SELECT coalesce(sum(value), 0) INTO _total
      FROM public.project_orders
      WHERE project_id = _o.project_id AND kind = _o.kind;

      IF _o.kind = 'produto' THEN
        UPDATE public.opportunities
        SET product_value = _total,
            value = _total + coalesce(service_value, 0)
        WHERE id = _opp;
      ELSE
        UPDATE public.opportunities
        SET service_value = _total,
            value = coalesce(product_value, 0) + _total
        WHERE id = _opp;
      END IF;
    END IF;
  END IF;
END
$fn$;

REVOKE ALL ON FUNCTION public.update_order_value(uuid, numeric, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.update_order_value(uuid, numeric, boolean) TO authenticated;
