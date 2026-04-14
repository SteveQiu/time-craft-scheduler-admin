
-- Update book_opening: don't mark opening as unavailable (allow multiple pending bookings)
CREATE OR REPLACE FUNCTION public.book_opening(_opening_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opening RECORD;
  _appointment_id uuid;
BEGIN
  SELECT * INTO _opening FROM openings WHERE id = _opening_id FOR UPDATE;
  
  IF _opening IS NULL THEN
    RAISE EXCEPTION 'Opening not found';
  END IF;
  
  IF NOT _opening.is_available THEN
    RAISE EXCEPTION 'Opening is no longer available';
  END IF;
  
  IF _opening.user_id = _user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Check if user already has a pending booking for this opening
  IF EXISTS (SELECT 1 FROM appointments WHERE opening_id = _opening_id AND user_id = _user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening';
  END IF;

  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  RETURN _appointment_id;
END;
$$;

-- Approve one appointment, reject others for same opening, mark opening unavailable
CREATE OR REPLACE FUNCTION public.approve_appointment(_appointment_id uuid, _provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _apt RECORD;
BEGIN
  SELECT * INTO _apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  
  IF _apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  IF _apt.provider_id != _provider_id AND NOT is_worker_of(_provider_id, _apt.provider_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF _apt.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending appointments';
  END IF;

  -- Approve the selected appointment
  UPDATE appointments SET status = 'confirmed' WHERE id = _appointment_id;

  -- Reject all other pending appointments for the same opening
  UPDATE appointments SET status = 'cancelled' 
  WHERE opening_id = _apt.opening_id AND id != _appointment_id AND status = 'pending';

  -- Mark opening as unavailable
  UPDATE openings SET is_available = false WHERE id = _apt.opening_id;
END;
$$;

-- Cancel appointment and re-open opening if no confirmed booking remains
CREATE OR REPLACE FUNCTION public.cancel_appointment(_appointment_id uuid, _caller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _apt RECORD;
  _has_confirmed boolean;
BEGIN
  SELECT * INTO _apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  
  IF _apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  -- Must be provider, booker, or worker of provider
  IF _apt.provider_id != _caller_id AND _apt.user_id != _caller_id AND NOT is_worker_of(_caller_id, _apt.provider_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF _apt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only cancel pending or confirmed appointments';
  END IF;

  UPDATE appointments SET status = 'cancelled' WHERE id = _appointment_id;

  -- Check if there are any remaining confirmed appointments for this opening
  SELECT EXISTS (
    SELECT 1 FROM appointments WHERE opening_id = _apt.opening_id AND status = 'confirmed' AND id != _appointment_id
  ) INTO _has_confirmed;

  -- Re-open the opening if no confirmed bookings remain
  IF NOT _has_confirmed THEN
    UPDATE openings SET is_available = true WHERE id = _apt.opening_id;
  END IF;
END;
$$;
