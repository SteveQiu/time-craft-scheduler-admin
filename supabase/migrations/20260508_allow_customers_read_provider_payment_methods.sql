-- Allow customers to read payment methods of providers they have appointments with.
-- Without this, customers see "provider hasn't configured payment methods" because
-- RLS blocked the SELECT (auth.uid() != provider's user_id).

CREATE POLICY "Customers can view provider payment methods"
  ON public.payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.provider_id = payment_methods.user_id
        AND appointments.user_id = auth.uid()
    )
  );
