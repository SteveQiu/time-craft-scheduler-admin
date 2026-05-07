-- Add hourly_rate to appointments table
-- Stores the rate at booking time so price is correct even if opening is later deleted

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) NOT NULL DEFAULT 0;

-- Backfill from existing openings where they still exist
UPDATE appointments a
SET hourly_rate = o.hourly_rate
FROM openings o
WHERE a.opening_id = o.id
  AND a.hourly_rate = 0
  AND o.hourly_rate > 0;

-- Update book_opening RPC to capture hourly_rate at booking time
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

  -- Create the new appointment — save hourly_rate so it survives opening deletion
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status, hourly_rate)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending', COALESCE(_opening.hourly_rate, 0))
  RETURNING id INTO _appointment_id;

  -- CRITICAL: Mark opening as unavailable immediately after booking
  UPDATE openings SET is_available = false WHERE id = _opening_id;

  RETURN _appointment_id;
END;
$$;
