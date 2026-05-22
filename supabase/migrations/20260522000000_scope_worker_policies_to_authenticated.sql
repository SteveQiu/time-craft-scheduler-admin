-- Scope worker helper policies to authenticated users only.
-- This prevents anonymous public pages from evaluating is_worker_of(),
-- which anon can no longer execute after the May 19 privilege hardening.

DROP POLICY IF EXISTS "Workers can view org openings" ON public.openings;
CREATE POLICY "Workers can view org openings"
  ON public.openings FOR SELECT
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can create org openings" ON public.openings;
CREATE POLICY "Workers can create org openings"
  ON public.openings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can update org openings" ON public.openings;
CREATE POLICY "Workers can update org openings"
  ON public.openings FOR UPDATE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can delete org openings" ON public.openings;
CREATE POLICY "Workers can delete org openings"
  ON public.openings FOR DELETE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can view org appointments" ON public.appointments;
CREATE POLICY "Workers can view org appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_worker_of(auth.uid(), provider_id));

DROP POLICY IF EXISTS "Workers can update org appointments" ON public.appointments;
CREATE POLICY "Workers can update org appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), provider_id));

DROP POLICY IF EXISTS "Workers can view org addresses" ON public.workplace_addresses;
CREATE POLICY "Workers can view org addresses"
  ON public.workplace_addresses FOR SELECT
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can create org addresses" ON public.workplace_addresses;
CREATE POLICY "Workers can create org addresses"
  ON public.workplace_addresses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can update org addresses" ON public.workplace_addresses;
CREATE POLICY "Workers can update org addresses"
  ON public.workplace_addresses FOR UPDATE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can delete org addresses" ON public.workplace_addresses;
CREATE POLICY "Workers can delete org addresses"
  ON public.workplace_addresses FOR DELETE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can view org payment methods" ON public.payment_methods;
CREATE POLICY "Workers can view org payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can create org payment methods" ON public.payment_methods;
CREATE POLICY "Workers can create org payment methods"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can update org payment methods" ON public.payment_methods;
CREATE POLICY "Workers can update org payment methods"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Workers can delete org payment methods" ON public.payment_methods;
CREATE POLICY "Workers can delete org payment methods"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (public.is_worker_of(auth.uid(), user_id));
