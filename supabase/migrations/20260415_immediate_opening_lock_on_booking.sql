-- Immediate Opening Lock on Booking
-- When a user books an opening, mark it as unavailable immediately
-- This prevents race conditions where 2 users can book the same opening

CREATE OR REPLACE FUNCTION public.book_opening(_opening_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opening RECORD;
  _appointment_id uuid;
  _existing_pending_count integer;
BEGIN
  -- Lock the opening row to prevent concurrent access
  SELECT * INTO _opening FROM openings WHERE id = _opening_id FOR UPDATE;
  
  IF _opening IS NULL THEN
    RAISE EXCEPTION 'Opening not found';
  END IF;
  
  -- Check if opening is still available
  IF NOT _opening.is_available THEN
    RAISE EXCEPTION 'Opening is no longer available';
  END IF;
  
  -- Cannot book your own opening
  IF _opening.user_id = _user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Check if user already has a pending booking for this opening
  SELECT COUNT(*) INTO _existing_pending_count 
  FROM appointments 
  WHERE opening_id = _opening_id 
  AND user_id = _user_id 
  AND status = 'pending';
  
  IF _existing_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening';
  END IF;

  -- Create the new appointment with pending status
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  -- CRITICAL: Mark opening as unavailable immediately after booking
  -- This prevents other users from booking the same opening
  UPDATE openings SET is_available = false WHERE id = _opening_id;

  RETURN _appointment_id;
END;
$$;

-- Comment explaining the change:
-- Before: Opening remained available after booking, allowing race conditions
-- After: Opening marked unavailable immediately, preventing multiple bookings
-- Effect: Other users see opening as "Not Available" when browsing
-- Benefit: Single opening can only be reserved by one user (very close to 100% safe)
