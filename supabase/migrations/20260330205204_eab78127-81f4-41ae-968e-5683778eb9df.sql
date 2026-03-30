
-- Table for recurring maintenance schedules
CREATE TABLE public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.maintenance_contracts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'preventive',
  periodicity TEXT NOT NULL DEFAULT 'monthly',
  next_date DATE NOT NULL,
  technician TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_7_days BOOLEAN NOT NULL DEFAULT true,
  notify_3_days BOOLEAN NOT NULL DEFAULT true,
  notify_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance_schedules"
  ON public.maintenance_schedules FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance_schedules"
  ON public.maintenance_schedules FOR INSERT TO public
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_schedules"
  ON public.maintenance_schedules FOR UPDATE TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance_schedules"
  ON public.maintenance_schedules FOR DELETE TO public
  USING (auth.uid() IS NOT NULL);

-- updated_at trigger
CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
