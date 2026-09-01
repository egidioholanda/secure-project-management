-- ============================================================
-- O serviço é um pedido só: licenças + instalação
-- ============================================================
-- A demanda chega separada por modalidade (CFTV, Controle de Acesso,
-- Alarme), com MATERIAL e SERVIÇO em cada uma, mais uma linha de
-- INFRAESTRUTURA. Mas o "serviço" de cada modalidade são LICENÇAS, e elas
-- são faturadas junto com a instalação, numa nota só.
--
-- Ou seja: o material se divide por modalidade e fatura separado; o serviço
-- é um pedido único do projeto, que engloba as licenças de todas as
-- modalidades e a infraestrutura. Dividir serviço por modalidade não
-- corresponde a nada que aconteça na prática.

INSERT INTO public.billing_categories (slug, label, active, sort_order) VALUES
  ('completo', 'Licenças + Instalação', false, 50)
ON CONFLICT (slug) DO NOTHING;

-- Todo pedido de serviço passa a ser o serviço inteiro do projeto,
-- independentemente das modalidades que o projeto tenha.
UPDATE public.project_orders
SET category = 'completo'
WHERE kind = 'servico' AND category <> 'completo';

-- A partir daqui, "não separado" só existe no material — que é o único lado
-- que faz sentido repartir.
