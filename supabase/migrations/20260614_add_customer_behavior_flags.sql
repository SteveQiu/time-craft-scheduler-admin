-- customer_behavior_flags: providers flag customers for improper behaviour
CREATE TABLE IF NOT EXISTS public.customer_behavior_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flagged_by, user_id)
);

ALTER TABLE public.customer_behavior_flags ENABLE ROW LEVEL SECURITY;

-- Provider can insert/update/delete their own flags
CREATE POLICY "Providers can manage their own customer flags"
  ON public.customer_behavior_flags FOR ALL
  USING (auth.uid() = flagged_by)
  WITH CHECK (auth.uid() = flagged_by);

CREATE INDEX IF NOT EXISTS idx_customer_behavior_flags_flagged_by ON public.customer_behavior_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_customer_behavior_flags_user_id ON public.customer_behavior_flags(user_id);
