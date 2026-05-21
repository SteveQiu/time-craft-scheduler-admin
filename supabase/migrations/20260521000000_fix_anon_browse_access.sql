-- Restore anonymous browse access for the public Browse page.
-- 20260415_strengthen_rls_policies.sql removed the old openings browse policy,
-- and 20260519015601_4cf4b35b-b27d-4318-8241-0fe5909a9399.sql revoked the
-- public profile-name helper from anon. Re-add only the safe anon access needed
-- for public browsing. We intentionally do not grant anon reads on appointments,
-- because that table includes booker PII and the browse page already degrades
-- gracefully when confirmed-slot filtering cannot run anonymously.

DROP POLICY IF EXISTS "Public can browse available openings" ON public.openings;

CREATE POLICY "Public can browse available openings"
  ON public.openings FOR SELECT
  TO anon, authenticated
  USING (is_available = true AND date >= current_date);

GRANT EXECUTE ON FUNCTION public.get_public_profile_names(uuid[]) TO anon;
