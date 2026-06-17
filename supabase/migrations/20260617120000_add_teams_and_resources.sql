-- ============================================================================
-- Teams, team members, and resources for installation/maintenance management.
-- Teams are linked to schedule_tasks to track availability.
-- ============================================================================

-- 1) Teams

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage teams"
  ON public.teams FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- 2) Team members (responsavel | tecnico)
--    Each team has exactly one responsavel enforced by the partial unique index.

CREATE TABLE IF NOT EXISTS public.team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('responsavel', 'tecnico')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Enforce single responsavel per team
CREATE UNIQUE INDEX IF NOT EXISTS team_single_responsavel
  ON public.team_members(team_id)
  WHERE role = 'responsavel';

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- 3) Resources — belong to a team (nullable: unassigned when team_id IS NULL)

CREATE TABLE IF NOT EXISTS public.resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('veiculo', 'ferramenta', 'equipamento')),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'disponivel'
              CHECK (status IN ('disponivel', 'em_uso', 'manutencao')),
  team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage resources"
  ON public.resources FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- 4) Link schedule tasks to teams

ALTER TABLE public.schedule_tasks
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;


-- 5) updated_at triggers

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_teams_updated_at') THEN
    CREATE TRIGGER set_teams_updated_at
      BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_resources_updated_at') THEN
    CREATE TRIGGER set_resources_updated_at
      BEFORE UPDATE ON public.resources
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
