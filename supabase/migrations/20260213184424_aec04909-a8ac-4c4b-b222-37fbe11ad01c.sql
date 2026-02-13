
-- Create appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id uuid NOT NULL REFERENCES public.openings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  worker text NOT NULL,
  service text NOT NULL,
  location text,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can view their own booked appointments
CREATE POLICY "Users can view their own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = user_id);

-- Providers can view appointments for their openings
CREATE POLICY "Providers can view appointments for their openings"
ON public.appointments FOR SELECT
USING (auth.uid() = provider_id);

-- Authenticated users can create appointments
CREATE POLICY "Authenticated users can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Providers can update appointment status
CREATE POLICY "Providers can update their appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = provider_id);

-- Users can cancel their own appointments
CREATE POLICY "Users can update their own appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
