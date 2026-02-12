
-- Allow any authenticated user to browse available openings
CREATE POLICY "Anyone can browse available openings"
  ON public.openings
  FOR SELECT
  USING (is_available = true);
