-- Add scale/coverage field to floor_plan_devices for FOV visualization
ALTER TABLE public.floor_plan_devices 
ADD COLUMN scale numeric DEFAULT 1.0;