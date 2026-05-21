-- Revoke EXECUTE from anon/authenticated/public on SECURITY DEFINER helpers
-- that are only meant to be called from within RLS policies or other DB functions.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_worker_of(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_appointment_totals(uuid[]) FROM PUBLIC, anon, authenticated;
