-- Handle Double-Booking: Approving 1 appointment rejects others for same opening
-- When provider approves an appointment, automatically reject any other pending appointments for that opening

CREATE OR REPLACE FUNCTION public.approve_appointment(_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _appointment RECORD;
  _opening_id uuid;
BEGIN
  -- Get the appointment
  SELECT id, opening_id, status INTO _appointment
  FROM appointments
  WHERE id = _appointment_id;
  
  IF _appointment IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  IF _appointment.status = 'confirmed' THEN
    RAISE EXCEPTION 'Appointment already confirmed';
  END IF;

  _opening_id := _appointment.opening_id;

  -- Approve this appointment
  UPDATE appointments 
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = _appointment_id;

  -- CRITICAL: Auto-reject all OTHER pending appointments for the same opening
  -- This handles the rare double-booking scenario where 2 users both reserved the slot
  UPDATE appointments
  SET status = 'rejected', updated_at = NOW()
  WHERE opening_id = _opening_id
  AND id != _appointment_id
  AND status = 'pending';

  RETURN _appointment_id;
END;
$$;

-- Reject appointment
CREATE OR REPLACE FUNCTION public.reject_appointment(_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _appointment RECORD;
BEGIN
  SELECT id, status INTO _appointment
  FROM appointments
  WHERE id = _appointment_id;
  
  IF _appointment IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF _appointment.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only reject pending or confirmed appointments';
  END IF;

  UPDATE appointments 
  SET status = 'rejected', updated_at = NOW()
  WHERE id = _appointment_id;

  RETURN _appointment_id;
END;
$$;
