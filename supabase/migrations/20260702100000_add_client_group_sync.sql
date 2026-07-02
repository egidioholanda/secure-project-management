-- ─── Add client_group_id to opportunities and projects ───────────────────────

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS client_group_id uuid REFERENCES public.client_groups(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_group_id uuid REFERENCES public.client_groups(id) ON DELETE SET NULL;

-- ─── Auto-populate from existing data ────────────────────────────────────────

-- Projects → from linked client
UPDATE public.projects p
SET client_group_id = c.client_group_id
FROM public.clients c
WHERE p.client_id = c.id
  AND c.client_group_id IS NOT NULL
  AND p.client_group_id IS NULL;

-- Opportunities → from linked project
UPDATE public.opportunities o
SET client_group_id = p.client_group_id
FROM public.projects p
WHERE p.opportunity_id = o.id
  AND p.client_group_id IS NOT NULL
  AND o.client_group_id IS NULL;

-- ─── Trigger: opportunity.client_group_id → project ──────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_group_opp_to_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.client_group_id IS DISTINCT FROM OLD.client_group_id THEN
    UPDATE public.projects
    SET client_group_id = NEW.client_group_id
    WHERE opportunity_id = NEW.id
      AND (client_group_id IS DISTINCT FROM NEW.client_group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_opp_to_project ON public.opportunities;
CREATE TRIGGER trg_sync_group_opp_to_project
  AFTER UPDATE OF client_group_id ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION fn_sync_group_opp_to_project();

-- ─── Trigger: project.client_group_id → opportunity + client ─────────────────

CREATE OR REPLACE FUNCTION fn_sync_group_project_cascade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.client_group_id IS DISTINCT FROM OLD.client_group_id THEN
    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET client_group_id = NEW.client_group_id
      WHERE id = NEW.opportunity_id
        AND (client_group_id IS DISTINCT FROM NEW.client_group_id);
    END IF;
    IF NEW.client_id IS NOT NULL THEN
      UPDATE public.clients
      SET client_group_id = NEW.client_group_id
      WHERE id = NEW.client_id
        AND (client_group_id IS DISTINCT FROM NEW.client_group_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_project_cascade ON public.projects;
CREATE TRIGGER trg_sync_group_project_cascade
  AFTER UPDATE OF client_group_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION fn_sync_group_project_cascade();

-- ─── Trigger: client.client_group_id → project ───────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_group_client_to_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.client_group_id IS DISTINCT FROM OLD.client_group_id THEN
    UPDATE public.projects
    SET client_group_id = NEW.client_group_id
    WHERE client_id = NEW.id
      AND (client_group_id IS DISTINCT FROM NEW.client_group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_client_to_project ON public.clients;
CREATE TRIGGER trg_sync_group_client_to_project
  AFTER UPDATE OF client_group_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION fn_sync_group_client_to_project();
