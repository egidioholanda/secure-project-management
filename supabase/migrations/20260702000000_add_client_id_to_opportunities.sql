-- Add client_id FK to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Auto-link existing opportunities to clients by case-insensitive name match
UPDATE public.opportunities o
SET client_id = c.id
FROM public.clients c
WHERE lower(trim(o.client)) = lower(trim(c.name))
  AND o.client_id IS NULL;
