-- Allow authenticated users to read payment methods of providers/orgs that have
-- available openings. Required for the booking confirmation dialog which shows
-- payment methods BEFORE an appointment is created (the existing policy only
-- covers post-booking reads via the appointments table).

CREATE POLICY "Authenticated users can view payment methods for providers with openings"
  ON public.payment_methods FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.openings
      WHERE openings.user_id = payment_methods.user_id
        AND openings.is_available = true
    )
  );
