ALTER TABLE schedule_tasks
ADD COLUMN IF NOT EXISTS dependencies TEXT[] DEFAULT '{}';
