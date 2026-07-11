-- schedule_tasks.project_id now also stores client IDs for contract-client tasks.
-- Drop the FK so inserts don't fail when the source is a client, not a project.
ALTER TABLE public.schedule_tasks
  DROP CONSTRAINT IF EXISTS schedule_tasks_project_id_fkey;
