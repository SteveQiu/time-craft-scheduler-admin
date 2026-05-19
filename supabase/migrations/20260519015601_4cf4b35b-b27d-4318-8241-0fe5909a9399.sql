-- Revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER functions that shouldn't be callable anonymously.

-- Trigger-only functions: revoke from everyone (triggers run as definer regardless).
REVOKE EXECUTE ON FUNCTION public.audit_appointments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_openings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_reports() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_reviews() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_appointment_update() FROM PUBLIC, anon, authenticated;

-- Auth-required helpers: revoke from anon, keep authenticated.
REVOKE EXECUTE ON FUNCTION public.get_appointment_contact_info(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_appointment_rates(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_appointment_totals(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_notifications(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_names(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_worker_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, uuid[], jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_appointment_contact_info(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_rates(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_totals(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_notifications(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_worker_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, uuid[], jsonb) TO authenticated;

-- Public profile lookups remain intentionally available to anon for shareable profile pages.
-- (get_public_profile, get_public_profile_by_id are left as-is.)