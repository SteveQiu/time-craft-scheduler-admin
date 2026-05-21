DROP POLICY IF EXISTS "Authenticated can read flags" ON public.appointment_flags;

CREATE POLICY "Flagged user can read own flags"
ON public.appointment_flags
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Flagging provider can read own flags"
ON public.appointment_flags
FOR SELECT
TO authenticated
USING (auth.uid() = flagged_by);

CREATE POLICY "Admins can read all flags"
ON public.appointment_flags
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'INTERNAL_DEV'::app_role));
