-- Run this in the Supabase SQL editor to apply
-- Allows provider OR customer to reschedule (modify) an appointment

CREATE OR REPLACE FUNCTION public.modify_appointment(
  _appointment_id UUID,
  _new_opening_id UUID,
  _caller_id UUID
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_apt RECORD;
  _new_opening RECORD;
  _new_appointment_id uuid;
BEGIN
  -- Lock and validate old appointment
  SELECT * INTO _old_apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  IF _old_apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  -- Allow the customer OR the provider to reschedule
  IF _old_apt.user_id != _caller_id AND _old_apt.provider_id != _caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Allow modification of pending OR confirmed appointments
  IF _old_apt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only modify pending or confirmed appointments';
  END IF;

  -- Lock and validate new opening
  SELECT * INTO _new_opening FROM openings WHERE id = _new_opening_id FOR UPDATE;
  IF _new_opening IS NULL THEN
    RAISE EXCEPTION 'New opening not found';
  END IF;
  IF NOT _new_opening.is_available THEN
    RAISE EXCEPTION 'New opening is no longer available';
  END IF;
  -- Only prevent booking your OWN opening as customer; provider rescheduling onto their own slot is ok
  IF _new_opening.user_id = _old_apt.user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Cancel old appointment
  UPDATE appointments SET status = 'cancelled' WHERE id = _appointment_id;

  -- Book new opening (creates pending appointment - needs provider re-approval)
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_new_opening.id, _old_apt.user_id, _new_opening.user_id, _new_opening.worker, _new_opening.service, _new_opening.location, _new_opening.date, _new_opening.start_time, _new_opening.end_time, _new_opening.duration, 'pending')
  RETURNING id INTO _new_appointment_id;

  RETURN _new_appointment_id;
END;
$$;
