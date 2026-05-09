-- Allow customers to read openings they have appointments for.
-- Without this, the payment method filter in Appointments.tsx is bypassed:
--   - Opening becomes is_available=false after booking
--   - Customer can't read it → paymentInfoOpening returns null
--   - Filter bypass fires → ALL provider methods shown to customer

CREATE POLICY "Customers can read their booked openings"
  ON public.openings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.opening_id = openings.id
        AND appointments.user_id = auth.uid()
    )
  );
