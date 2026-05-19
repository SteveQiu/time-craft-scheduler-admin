-- appointment_flags: providers flag users as no-show
CREATE TABLE IF NOT EXISTS public.appointment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'no_show',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, flagged_by)
);

ALTER TABLE public.appointment_flags ENABLE ROW LEVEL SECURITY;

-- Provider can flag appointments they manage
CREATE POLICY "Providers can insert flags"
  ON public.appointment_flags FOR INSERT
  WITH CHECK (auth.uid() = flagged_by);

-- Provider can delete their own flags
CREATE POLICY "Providers can delete own flags"
  ON public.appointment_flags FOR DELETE
  USING (auth.uid() = flagged_by);

-- Authenticated can read flags (needed for attendance stats)
CREATE POLICY "Authenticated can read flags"
  ON public.appointment_flags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_appointment_flags_appointment ON public.appointment_flags(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_flags_user ON public.appointment_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_flags_flagged_by ON public.appointment_flags(flagged_by);

-- RPC: get attendance stats for a user as seen by current provider
CREATE OR REPLACE FUNCTION public.get_user_attendance_stats(
  p_user_id UUID,
  p_provider_id UUID
) RETURNS TABLE (
  total_count BIGINT,
  flagged_count BIGINT,
  attendance_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT a.id)::BIGINT AS total_count,
    COUNT(DISTINCT af.appointment_id)::BIGINT AS flagged_count,
    CASE
      WHEN COUNT(DISTINCT a.id) = 0 THEN 100
      ELSE ROUND(
        ((COUNT(DISTINCT a.id) - COUNT(DISTINCT af.appointment_id))::NUMERIC / COUNT(DISTINCT a.id)::NUMERIC) * 100,
        0
      )
    END AS attendance_pct
  FROM public.appointments a
  LEFT JOIN public.appointment_flags af
    ON af.appointment_id = a.id
    AND af.flagged_by = p_provider_id
  WHERE a.user_id = p_user_id
    AND a.provider_id = p_provider_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_attendance_stats(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_attendance_stats(UUID, UUID) TO authenticated;
