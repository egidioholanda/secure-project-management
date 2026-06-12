
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  introduction TEXT,
  scope TEXT,
  validity_days INTEGER NOT NULL DEFAULT 30,
  payment_terms TEXT,
  warranty_terms TEXT,
  notes TEXT,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_templates TO authenticated;
GRANT ALL ON public.proposal_templates TO service_role;

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.proposal_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create templates"
  ON public.proposal_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update templates"
  ON public.proposal_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete templates"
  ON public.proposal_templates FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.proposal_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.proposal_templates(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  installation_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_template_items TO authenticated;
GRANT ALL ON public.proposal_template_items TO service_role;

ALTER TABLE public.proposal_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template items"
  ON public.proposal_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create template items"
  ON public.proposal_template_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update template items"
  ON public.proposal_template_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete template items"
  ON public.proposal_template_items FOR DELETE TO authenticated USING (true);
