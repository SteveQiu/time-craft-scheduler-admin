-- Per-appointment payment method lookup.
-- Uses opening.accepted_payment_method_ids to return only the methods
-- accepted for each specific appointment/opening, not all provider methods.
-- If accepted_payment_method_ids is null/empty, falls back to all provider methods.
CREATE OR REPLACE FUNCTION public.get_appointment_accepted_payment_method_types(p_appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid, type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS appointment_id,
    pm.type
  FROM public.appointments a
  JOIN public.openings o ON o.id = a.opening_id
  JOIN public.payment_methods pm ON (
    pm.user_id = a.provider_id
    AND (
      o.accepted_payment_method_ids IS NULL
      OR array_length(o.accepted_payment_method_ids, 1) IS NULL
      OR pm.id = ANY(o.accepted_payment_method_ids::uuid[])
    )
  )
  WHERE a.id = ANY(p_appointment_ids)
    AND (
      a.user_id = auth.uid()
      OR a.provider_id = auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_appointment_accepted_payment_method_types(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_appointment_accepted_payment_method_types(uuid[]) TO authenticated;
