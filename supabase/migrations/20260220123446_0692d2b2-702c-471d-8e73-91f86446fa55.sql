
-- Tabela de clientes
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cnpj text,
  contact_name text,
  email text,
  phone text,
  address text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Tabela de contratos de manutenção
CREATE TABLE public.maintenance_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'preventive', -- 'preventive', 'corrective', 'both'
  periodicity text, -- 'monthly', 'quarterly', 'semiannual', 'annual'
  start_date date,
  end_date date,
  value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'expired'
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance_contracts"
  ON public.maintenance_contracts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance_contracts"
  ON public.maintenance_contracts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_contracts"
  ON public.maintenance_contracts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance_contracts"
  ON public.maintenance_contracts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Tabela de ordens de serviço de manutenção
CREATE TABLE public.maintenance_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.maintenance_contracts(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'preventive', -- 'preventive', 'corrective'
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  technician text,
  scheduled_date date,
  completed_date date,
  description text,
  observations text,
  equipment_attended text[], -- lista de equipamentos atendidos
  signature_url text, -- URL da assinatura digital
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance_orders"
  ON public.maintenance_orders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance_orders"
  ON public.maintenance_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_orders"
  ON public.maintenance_orders FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance_orders"
  ON public.maintenance_orders FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Tabela de fotos das ordens de manutenção
CREATE TABLE public.maintenance_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.maintenance_orders(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance_photos"
  ON public.maintenance_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance_photos"
  ON public.maintenance_photos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance_photos"
  ON public.maintenance_photos FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Bucket de armazenamento para fotos de manutenção e assinaturas
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-files', 'maintenance-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload maintenance files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'maintenance-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Maintenance files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maintenance-files');

CREATE POLICY "Authenticated users can delete maintenance files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'maintenance-files' AND auth.uid() IS NOT NULL);

-- Triggers de updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_contracts_updated_at
  BEFORE UPDATE ON public.maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_orders_updated_at
  BEFORE UPDATE ON public.maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
