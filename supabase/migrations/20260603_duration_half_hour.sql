-- Allow half-hour durations: change duration column from INTEGER to NUMERIC
ALTER TABLE public.openings
  ALTER COLUMN duration TYPE NUMERIC USING duration::NUMERIC;

ALTER TABLE public.appointments
  ALTER COLUMN duration TYPE NUMERIC USING duration::NUMERIC;

-- Update check constraint to allow decimal values like 0.5
ALTER TABLE public.openings
  DROP CONSTRAINT IF EXISTS openings_duration_check;

ALTER TABLE public.openings
  ADD CONSTRAINT openings_duration_check CHECK (duration > 0);
