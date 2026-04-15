-- Allow modifying BOTH pending and confirmed appointments
-- When modifying a confirmed appointment, cancel it and create a new pending booking

CREATE OR REPLACE FUNCTION public.modify_appointment(_appointment_id uuid, _new_opening_id uuid, _caller_id uuid)
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
  IF _old_apt.user_id != _caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Allow modifying both pending AND confirmed appointments
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
  IF _new_opening.user_id = _caller_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Cancel old appointment
  UPDATE appointments SET status = 'cancelled' WHERE id = _appointment_id;

  -- When cancelling a confirmed appointment, re-open its opening if no other confirmed bookings
  IF _old_apt.status = 'confirmed' THEN
    -- Check if there are any other confirmed appointments for this opening
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE opening_id = _old_apt.opening_id 
      AND status = 'confirmed' 
      AND id != _appointment_id
    ) THEN
      -- No other confirmed bookings, mark as available again
      UPDATE openings SET is_available = true WHERE id = _old_apt.opening_id;
    END IF;
  END IF;

  -- Book new opening with same status as old (pending if was pending, pending if was confirmed - user must re-confirm)
  -- Always create as pending so provider can re-confirm the new time
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_new_opening.id, _caller_id, _new_opening.user_id, _new_opening.worker, _new_opening.service, _new_opening.location, _new_opening.date, _new_opening.start_time, _new_opening.end_time, _new_opening.duration, 'pending')
  RETURNING id INTO _new_appointment_id;

  RETURN _new_appointment_id;
END;
$$;
