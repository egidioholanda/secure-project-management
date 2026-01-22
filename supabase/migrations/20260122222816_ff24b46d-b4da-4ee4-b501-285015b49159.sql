-- Add opportunity_id column to projects table for linking
ALTER TABLE public.projects 
ADD COLUMN opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_projects_opportunity_id ON public.projects(opportunity_id);