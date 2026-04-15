-- Create appointment history table for audit trail
CREATE TABLE public.appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;

-- Users can view history for their own appointments
CREATE POLICY "Users can view history of their appointments"
  ON public.appointment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_history.appointment_id
      AND (auth.uid() = a.user_id OR auth.uid() = a.provider_id)
    )
  );

-- Add indexes for query performance
CREATE INDEX idx_appointment_history_appointment_id ON public.appointment_history(appointment_id);
CREATE INDEX idx_appointment_history_changed_at ON public.appointment_history(changed_at);
CREATE INDEX idx_appointment_history_changed_by ON public.appointment_history(changed_by);

-- Create trigger function to log appointment status changes
CREATE OR REPLACE FUNCTION public.log_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only log if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.appointment_history (appointment_id, old_status, new_status, changed_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on appointments table
CREATE TRIGGER log_appointment_status_change
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.log_appointment_change();

-- Create function to get appointment timeline
CREATE OR REPLACE FUNCTION public.get_appointment_timeline(_appointment_id UUID)
RETURNS TABLE (
  status TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,
  changed_by UUID,
  duration_since_last_change INTERVAL
)
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH history AS (
    SELECT 
      COALESCE(h.new_status, a.status) as status,
      COALESCE(h.changed_at, a.created_at) as changed_at,
      h.changed_by,
      LAG(COALESCE(h.changed_at, a.created_at)) OVER (ORDER BY COALESCE(h.changed_at, a.created_at) DESC) as prev_change_at
    FROM public.appointments a
    LEFT JOIN public.appointment_history h ON h.appointment_id = a.id
    WHERE a.id = _appointment_id
    ORDER BY COALESCE(h.changed_at, a.created_at) DESC
  )
  SELECT 
    status,
    changed_at,
    changed_by,
    CASE 
      WHEN prev_change_at IS NULL THEN NULL
      ELSE (changed_at - prev_change_at)
    END as duration_since_last_change
  FROM history;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_timeline TO authenticated;
