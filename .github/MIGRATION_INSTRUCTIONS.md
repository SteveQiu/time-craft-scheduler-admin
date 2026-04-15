⚠️  MIGRATION REQUIRED - MANUAL APPLICATION NEEDED

The immediate opening lock migration needs to be applied to your Supabase database.

============================================================================
STEPS TO APPLY THE MIGRATION:
============================================================================

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar  
4. Click "New query" button
5. Delete any default text
6. Copy and paste the SQL below:

============================================================================
SQL TO EXECUTE:
============================================================================

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

============================================================================

7. Click the "RUN" button (blue button in bottom right)
8. You should see a green checkmark and "Success"

WHAT THIS DOES:
===============
- Updates the book_opening() RPC function
- Adds the critical line: UPDATE openings SET is_available = false
- Ensures that when someone books an opening, it's immediately locked
- Prevents race conditions where 2 users could book the same opening

VERIFICATION:
=============
After applying:
1. Go back to the browser at http://localhost:8084/browse
2. Try booking an appointment
3. After booking, the opening should disappear from the browse list
4. Other users should NOT be able to see or book that opening

If you have any issues, let me know!
