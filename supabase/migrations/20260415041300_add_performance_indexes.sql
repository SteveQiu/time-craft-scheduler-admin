-- Add missing indexes for appointment queries (critical for Browse performance)
CREATE INDEX IF NOT EXISTS idx_appointments_opening_id ON public.appointments(opening_id);
CREATE INDEX IF NOT EXISTS idx_appointments_opening_status ON public.appointments(opening_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON public.appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Add composite index for appointments by status and date
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, created_at DESC);

-- Add constraint to prevent duplicate pending bookings for same opening
ALTER TABLE public.appointments
ADD CONSTRAINT unique_pending_booking_per_user
UNIQUE (opening_id, user_id) 
WHERE status = 'pending';
