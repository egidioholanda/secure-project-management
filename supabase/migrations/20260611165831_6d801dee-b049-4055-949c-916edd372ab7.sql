-- Add approval workflow to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));

-- Backfill existing profiles as approved (per user choice)
UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE approval_status = 'pending';

-- Update default for new rows: keep 'pending'
ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Trigger ensures new signups start pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'pending');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow admins and managers to update approval fields on any profile
DROP POLICY IF EXISTS "Admins and managers can approve users" ON public.profiles;
CREATE POLICY "Admins and managers can approve users"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
