-- SECURITY DEFINER fallback for appointment payment method reads.
-- Keeps customer payment badge logic working even if SELECT policy on
-- payment_methods is missing or not yet applied in remote DB.
CREATE OR REPLACE FUNCTION public.get_appointment_provider_payment_methods(provider_ids uuid[])
RETURNS TABLE(id uuid, type text, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.id, pm.type, pm.user_id
  FROM public.payment_methods pm
  WHERE pm.user_id = ANY(provider_ids)
    AND (
      pm.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.provider_id = pm.user_id
          AND (a.user_id = auth.uid() OR a.provider_id = auth.uid())
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_appointment_provider_payment_methods(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_appointment_provider_payment_methods(uuid[]) TO authenticated;
