-- Tabela de categorias de dispositivos
CREATE TABLE public.device_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dispositivos (catálogo)
CREATE TABLE public.devices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.device_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    model TEXT,
    brand TEXT,
    description TEXT,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    installation_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    icon TEXT,
    specifications JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de plantas baixas dos projetos
CREATE TABLE public.project_floor_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dispositivos posicionados na planta
CREATE TABLE public.floor_plan_devices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    floor_plan_id UUID REFERENCES public.project_floor_plans(id) ON DELETE CASCADE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
    x_position DECIMAL(10,2) NOT NULL,
    y_position DECIMAL(10,2) NOT NULL,
    rotation INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de propostas comerciais
CREATE TABLE public.proposals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    client_address TEXT,
    introduction TEXT,
    scope TEXT,
    validity_days INTEGER DEFAULT 30,
    payment_terms TEXT,
    warranty_terms TEXT,
    notes TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_devices DECIMAL(12,2) DEFAULT 0,
    total_installation DECIMAL(12,2) DEFAULT 0,
    total_discount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da proposta
CREATE TABLE public.proposal_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    device_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    installation_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (por enquanto, sem autenticação)
CREATE POLICY "Allow all for device_categories" ON public.device_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for devices" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for project_floor_plans" ON public.project_floor_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for floor_plan_devices" ON public.floor_plan_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for proposal_items" ON public.proposal_items FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias padrão
INSERT INTO public.device_categories (name, icon) VALUES 
('Câmeras', 'Camera'),
('Sensores', 'Radio'),
('Controle de Acesso', 'DoorOpen'),
('Alarmes', 'Bell'),
('Cercas Elétricas', 'Zap'),
('Interfones', 'Phone');

-- Inserir dispositivos de exemplo
INSERT INTO public.devices (category_id, name, model, brand, unit_price, installation_price, icon, description) 
SELECT id, 'Câmera Dome HD', 'VIP 1130 D', 'Intelbras', 350.00, 80.00, 'Camera', 'Câmera dome HD 720p com infravermelho'
FROM public.device_categories WHERE name = 'Câmeras';

INSERT INTO public.devices (category_id, name, model, brand, unit_price, installation_price, icon, description) 
SELECT id, 'Câmera Bullet 4MP', 'VIP 3430 B', 'Intelbras', 650.00, 100.00, 'Camera', 'Câmera bullet 4MP com PoE'
FROM public.device_categories WHERE name = 'Câmeras';

INSERT INTO public.devices (category_id, name, model, brand, unit_price, installation_price, icon, description) 
SELECT id, 'Sensor de Presença', 'IVP 3000', 'Intelbras', 120.00, 50.00, 'Radio', 'Sensor de presença infravermelho'
FROM public.device_categories WHERE name = 'Sensores';

INSERT INTO public.devices (category_id, name, model, brand, unit_price, installation_price, icon, description) 
SELECT id, 'Catraca Pedestal', 'CT 3000', 'Control iD', 4500.00, 500.00, 'DoorOpen', 'Catraca de acesso com leitor biométrico'
FROM public.device_categories WHERE name = 'Controle de Acesso';

INSERT INTO public.devices (category_id, name, model, brand, unit_price, installation_price, icon, description) 
SELECT id, 'Leitor Biométrico', 'iDFlex', 'Control iD', 1200.00, 150.00, 'Fingerprint', 'Leitor biométrico de impressão digital'
FROM public.device_categories WHERE name = 'Controle de Acesso';

-- Criar bucket para armazenar plantas baixas
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true);

-- Políticas de storage
CREATE POLICY "Allow public read floor-plans" ON storage.objects FOR SELECT USING (bucket_id = 'floor-plans');
CREATE POLICY "Allow public insert floor-plans" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'floor-plans');
CREATE POLICY "Allow public update floor-plans" ON storage.objects FOR UPDATE USING (bucket_id = 'floor-plans');
CREATE POLICY "Allow public delete floor-plans" ON storage.objects FOR DELETE USING (bucket_id = 'floor-plans');