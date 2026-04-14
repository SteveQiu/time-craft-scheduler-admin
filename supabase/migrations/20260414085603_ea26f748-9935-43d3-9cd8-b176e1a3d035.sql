
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
  -- Lock and fetch the opening
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

  -- Create appointment
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  -- Mark opening as unavailable
  UPDATE openings SET is_available = false WHERE id = _opening_id;

  RETURN _appointment_id;
END;
$$;
