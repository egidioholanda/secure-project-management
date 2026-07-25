-- reports.project_id references public.projects(id), but the report dialog also lets
-- users pick a maintenance/contract client (public.clients.id) as the "project" — those
-- IDs don't exist in public.projects, so saving a report for a maintenance client violated
-- this foreign key and the insert failed. project_name is already denormalized for display
-- and no query embeds/joins reports to projects via this FK, so it's safe to drop it and
-- let project_id loosely reference either a project or a maintenance client.
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_project_id_fkey;
