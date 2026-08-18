-- ============================================================
-- projects.value deixa de ser TEXT
-- ============================================================
-- A conversão de oportunidade em projeto gravava o número cru vindo do
-- JavaScript ("9852.07", e num caso "64122.090000000004", com o erro de
-- ponto flutuante à mostra), enquanto os projetos antigos usavam o formato
-- BR ("R$ 9.852"). Duas grafias na mesma coluna de texto.
--
-- Pior: parseBRL trata ponto como separador de milhar, então "9852.07"
-- seria lido como 985.207 — cem vezes o valor. Não chegou a afetar os KPIs
-- porque esses projetos têm product_value/service_value e o painel usa o
-- split, mas era uma bomba armada para o primeiro projeto sem split.

ALTER TABLE public.projects
  ALTER COLUMN value TYPE numeric(14,2)
  USING CASE
    -- 43 dos 45 projetos têm o split: o total é a soma, sem heurística
    WHEN product_value IS NOT NULL OR service_value IS NOT NULL
      THEN round(coalesce(product_value, 0) + coalesce(service_value, 0), 2)
    -- os demais estão todos no formato BR, onde o ponto é milhar
    ELSE round(public.brl_to_numeric(value), 2)
  END;
