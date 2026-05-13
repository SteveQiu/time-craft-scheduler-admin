-- Returns email + phone for appointment participants that the caller is party to.
-- SECURITY DEFINER bypasses RLS — the guard clause ensures only legitimate
-- co-participants can retrieve each other's contact info.
CREATE OR REPLACE FUNCTION get_appointment_contact_info(profile_ids uuid[])
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.email, p.phone
  FROM profiles p
  WHERE p.id = ANY(profile_ids)
    AND (
      -- Caller must share at least one appointment with this profile
      EXISTS (
        SELECT 1 FROM appointments a
        WHERE (a.user_id = auth.uid() OR a.provider_id = auth.uid())
          AND (a.user_id = p.id OR a.provider_id = p.id)
      )
      OR p.id = auth.uid()  -- always allow self-lookup
    );
$$;

GRANT EXECUTE ON FUNCTION get_appointment_contact_info(uuid[]) TO authenticated;
