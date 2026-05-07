-- SECURITY DEFINER RPC so customers can get rates for their own appointments
-- without needing direct access to openings, org_workers, or profiles tables
CREATE OR REPLACE FUNCTION public.get_appointment_rates(_appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid, hourly_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    COALESCE(
      NULLIF(o.hourly_rate, 0),   -- surviving opening rate (best source)
      NULLIF(ow.hourly_rate, 0),  -- org_workers rate (for org providers)
      NULLIF(p.hourly_rate, 0),   -- provider profile rate (last resort)
      0::numeric
    ) AS hourly_rate
  FROM appointments a
  LEFT JOIN openings o ON a.opening_id = o.id
  LEFT JOIN org_workers ow
    ON ow.org_id = a.provider_id
    AND ow.worker_name = a.worker
    AND ow.status = 'accepted'
  LEFT JOIN profiles p ON p.id = a.provider_id
  WHERE a.id = ANY(_appointment_ids)
    AND (a.user_id = auth.uid() OR a.provider_id = auth.uid());
END;
$$;
