-- ============================================================
-- Projeto novo nasce com seus pedidos
-- ============================================================
-- A Fase 1 passou o faturamento a girar em torno de project_orders, mas nada
-- criava os pedidos de um projeto NOVO: ele nascia sem pedido e ficava
-- invisível no painel financeiro. Aconteceu com "Base Avançada Brejo Santo"
-- (R$ 88.237,88) horas depois do deploy.
--
-- Fica no banco porque é invariante do modelo, não regra de uma tela: vale
-- para a conversão de oportunidade, para o cadastro manual e para qualquer
-- import futuro.

CREATE OR REPLACE FUNCTION public.create_orders_for_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _cat text;
BEGIN
  -- Uma modalidade só: a categoria é determinística. Duas ou mais: entra como
  -- `nao_separado`, para alguém repartir sabendo os valores reais.
  _cat := CASE
    WHEN array_length(string_to_array(coalesce(NEW.type, ''), ','), 1) = 1
      THEN coalesce(public.category_slug(btrim(NEW.type)), 'nao_separado')
    ELSE 'nao_separado'
  END;

  IF coalesce(NEW.product_value, 0) > 0 THEN
    INSERT INTO public.project_orders (project_id, category, kind, value)
    VALUES (NEW.id, _cat, 'produto', NEW.product_value)
    ON CONFLICT (project_id, category, kind) DO NOTHING;
  END IF;

  -- serviço é sempre o pedido inteiro: licenças de todas as modalidades mais
  -- a instalação, faturadas numa nota só
  IF coalesce(NEW.service_value, 0) > 0 THEN
    INSERT INTO public.project_orders (project_id, category, kind, value)
    VALUES (NEW.id, 'completo', 'servico', NEW.service_value)
    ON CONFLICT (project_id, category, kind) DO NOTHING;
  END IF;

  RETURN NULL;
END
$fn$;

-- AFTER INSERT apenas: o UPDATE em projects é feito pela trigger de sincronia
-- dos agregados, e reagir a ele criaria recursão.
DROP TRIGGER IF EXISTS trg_create_orders_for_new_project ON public.projects;
CREATE TRIGGER trg_create_orders_for_new_project
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_orders_for_new_project();

-- ── Recuperar quem já nasceu sem pedido ─────────────────────
-- Os valores são lidos ANTES de qualquer insert. Inserir o pedido de produto
-- dispara trg_sync_project_values, que recalcula o projeto a partir dos
-- pedidos existentes e zera o service_value que ainda não tem pedido — o
-- segundo insert então não encontra mais valor nenhum. Foi o que aconteceu
-- com "Base Avançada Brejo Santo": R$ 45.579,00 de serviço zerados entre um
-- insert e o outro, recuperados da oportunidade vinculada.
CREATE TEMP TABLE _faltantes AS
SELECT p.id,
       CASE
         WHEN array_length(string_to_array(coalesce(p.type, ''), ','), 1) = 1
           THEN coalesce(public.category_slug(btrim(p.type)), 'nao_separado')
         ELSE 'nao_separado'
       END AS cat,
       coalesce(p.product_value, 0) AS prod,
       coalesce(p.service_value, 0) AS serv
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.project_orders o WHERE o.project_id = p.id)
  AND (coalesce(p.product_value, 0) > 0 OR coalesce(p.service_value, 0) > 0);

INSERT INTO public.project_orders (project_id, category, kind, value)
SELECT id, cat, 'produto', prod FROM _faltantes WHERE prod > 0
UNION ALL
SELECT id, 'completo', 'servico', serv FROM _faltantes WHERE serv > 0
ON CONFLICT (project_id, category, kind) DO NOTHING;

DROP TABLE _faltantes;
