-- Stores company-wide context injected into the AI agent system prompt
CREATE TABLE IF NOT EXISTS public.ai_context (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_context ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (context is company-wide)
CREATE POLICY "ai_context_read"
  ON public.ai_context
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can write (admin-only enforced in the UI)
CREATE POLICY "ai_context_write"
  ON public.ai_context
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
