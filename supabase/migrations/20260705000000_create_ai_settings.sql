CREATE TABLE IF NOT EXISTS public.ai_settings (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'grok')),
  model      TEXT NOT NULL,
  api_key    TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_settings_owner_policy" ON public.ai_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Garante que só exista uma chave ativa por usuário por vez
CREATE OR REPLACE FUNCTION public.deactivate_other_ai_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ai_settings
  SET active = false
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND active = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_settings_single_active
  AFTER INSERT OR UPDATE OF active ON public.ai_settings
  FOR EACH ROW
  WHEN (NEW.active = true)
  EXECUTE FUNCTION public.deactivate_other_ai_settings();
