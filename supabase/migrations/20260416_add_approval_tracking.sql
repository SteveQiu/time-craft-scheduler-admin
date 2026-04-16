-- Add approval tracking to appointments table
-- This tracks who approved each appointment (may be different from provider)

ALTER TABLE public.appointments 
ADD COLUMN approved_by uuid;

-- Add foreign key reference to profiles (if person exists)
ALTER TABLE public.appointments
ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update approve_appointment RPC to store who approved
CREATE OR REPLACE FUNCTION public.approve_appointment(_appointment_id uuid, _provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _apt RECORD;
  _current_user_id uuid := auth.uid();
BEGIN
  -- ✅ Validate authentication
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'PGRST401';
  END IF;
  
  -- ✅ Validate _provider_id matches caller or caller is worker
  IF _current_user_id != _provider_id AND NOT is_worker_of(_current_user_id, _provider_id) THEN
    RAISE EXCEPTION 'Not authorized - must be provider' USING ERRCODE = 'PGRST403';
  END IF;
  
  SELECT * INTO _apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  
  IF _apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'PGRST404';
  END IF;
  
  IF _apt.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending appointments' USING ERRCODE = 'PGRST409';
  END IF;

  -- Approve the selected appointment and track who approved it
  UPDATE appointments 
  SET status = 'confirmed', approved_by = _current_user_id 
  WHERE id = _appointment_id;

  -- Reject all other pending appointments for the same opening
  UPDATE appointments 
  SET status = 'cancelled' 
  WHERE opening_id = _apt.opening_id AND id != _appointment_id AND status = 'pending';

  -- Mark opening as unavailable
  UPDATE openings SET is_available = false WHERE id = _apt.opening_id;
END;
$$;

-- Update reject_appointment RPC if it exists to also track who rejected
CREATE OR REPLACE FUNCTION public.reject_appointment(_appointment_id uuid, _provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _apt RECORD;
  _current_user_id uuid := auth.uid();
BEGIN
  -- ✅ Validate authentication
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'PGRST401';
  END IF;
  
  -- ✅ Validate _provider_id matches caller or caller is worker
  IF _current_user_id != _provider_id AND NOT is_worker_of(_current_user_id, _provider_id) THEN
    RAISE EXCEPTION 'Not authorized - must be provider' USING ERRCODE = 'PGRST403';
  END IF;
  
  SELECT * INTO _apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  
  IF _apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'PGRST404';
  END IF;
  
  IF _apt.status != 'pending' THEN
    RAISE EXCEPTION 'Can only reject pending appointments' USING ERRCODE = 'PGRST409';
  END IF;

  -- Reject the appointment and track who rejected it
  UPDATE appointments 
  SET status = 'cancelled', approved_by = _current_user_id 
  WHERE id = _appointment_id;

  -- Re-open the opening for others to book
  UPDATE openings SET is_available = true WHERE id = _apt.opening_id;
END;
$$;

-- Create index on approved_by for better query performance in org views
CREATE INDEX idx_appointments_approved_by ON public.appointments(approved_by);
