-- Backfill profiles for any auth.users that don't have a corresponding
-- profile record (can happen when the trigger fails or for admin-created users).
-- These users are set as 'approved' since they were admin-created intentionally.

INSERT INTO public.profiles (user_id, email, full_name, approval_status, approved_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'approved',
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Also ensure all admin-created users have their user_roles record
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  'user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id
)
ON CONFLICT DO NOTHING;
