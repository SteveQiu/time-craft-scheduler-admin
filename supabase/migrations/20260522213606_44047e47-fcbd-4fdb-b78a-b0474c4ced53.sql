-- Restore EXECUTE on helper functions used inside RLS policies.
-- Revoking from anon/authenticated broke evaluation of policies that reference these
-- functions (e.g. openings' worker policies), causing "permission denied for function" errors
-- even for legitimate public/authenticated queries.
GRANT EXECUTE ON FUNCTION public.is_worker_of(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_totals(uuid[]) TO authenticated;