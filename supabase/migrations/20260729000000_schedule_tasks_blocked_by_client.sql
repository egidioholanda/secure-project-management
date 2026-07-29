-- Lets a task be manually flagged as stopped due to the client's fault. When set,
-- the Gantt shows the task (and its project, since it's the "worst" status) in purple
-- instead of the computed on-track/at-risk/overdue/completed color.
ALTER TABLE public.schedule_tasks
ADD COLUMN IF NOT EXISTS blocked_by_client boolean NOT NULL DEFAULT false;
