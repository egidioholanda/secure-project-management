-- Add product and service value split to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS product_value TEXT,
  ADD COLUMN IF NOT EXISTS service_value TEXT;
