-- FIX: Validate user authentication in book_opening RPC
-- The RPC was accepting arbitrary _user_id from client without validation
-- This caused appointments to be created but invisible due to RLS policy mismatch

-- Root cause:
-- 1. book_opening accepts _user_id parameter from client
-- 2. RPC is SECURITY DEFINER (runs as superuser, bypasses RLS)
-- 3. No validation that _user_id matches auth.uid()
-- 4. Client tries to SELECT appointment after booking
-- 5. RLS policy "(auth.uid() = user_id)" blocks it because:
--    - Appointment created with parameter _user_id (might be wrong)
--    - Client's auth.uid() doesn't match
--    - SELECT returns empty! User sees "Failed to book"

CREATE OR REPLACE FUNCTION public.book_opening(_opening_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opening RECORD;
  _appointment_id uuid;
  _current_user_id uuid := auth.uid();
BEGIN
  -- ✅ CRITICAL: Validate user is authenticated
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - please sign in to book' USING ERRCODE = 'PGRST401';
  END IF;
  
  -- ✅ CRITICAL: Validate _user_id matches authenticated user
  -- This prevents client from booking for arbitrary users
  IF _current_user_id != _user_id THEN
    RAISE EXCEPTION 'User ID mismatch - cannot book for another user' USING ERRCODE = 'PGRST403';
  END IF;
  
  -- Get and lock the opening
  SELECT * INTO _opening FROM openings WHERE id = _opening_id FOR UPDATE;
  
  IF _opening IS NULL THEN
    RAISE EXCEPTION 'Opening not found' USING ERRCODE = 'PGRST404';
  END IF;
  
  IF NOT _opening.is_available THEN
    RAISE EXCEPTION 'Opening is no longer available' USING ERRCODE = 'PGRST409';
  END IF;
  
  IF _opening.user_id = _current_user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening' USING ERRCODE = 'PGRST403';
  END IF;

  -- Check if user already has a pending booking for this opening
  IF EXISTS (SELECT 1 FROM appointments WHERE opening_id = _opening_id AND user_id = _current_user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening' USING ERRCODE = 'PGRST409';
  END IF;

  -- ✅ Use _current_user_id (validated) instead of _user_id parameter
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _current_user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  RETURN _appointment_id;
END;
$$;

-- Also fix other RPC functions that might have similar issues

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

  -- Approve the selected appointment
  UPDATE appointments SET status = 'confirmed' WHERE id = _appointment_id;

  -- Reject all other pending appointments for the same opening
  UPDATE appointments SET status = 'cancelled' 
  WHERE opening_id = _apt.opening_id AND id != _appointment_id AND status = 'pending';

  -- Mark opening as unavailable
  UPDATE openings SET is_available = false WHERE id = _apt.opening_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_appointment(_appointment_id uuid, _caller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _apt RECORD;
  _has_confirmed boolean;
  _current_user_id uuid := auth.uid();
BEGIN
  -- ✅ Validate authentication
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'PGRST401';
  END IF;
  
  -- ✅ Validate _caller_id matches authenticated user
  IF _current_user_id != _caller_id THEN
    RAISE EXCEPTION 'Caller ID mismatch' USING ERRCODE = 'PGRST403';
  END IF;
  
  SELECT * INTO _apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  
  IF _apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'PGRST404';
  END IF;

  -- Must be provider, booker, or worker of provider
  IF _apt.provider_id != _current_user_id AND _apt.user_id != _current_user_id AND NOT is_worker_of(_current_user_id, _apt.provider_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'PGRST403';
  END IF;
  
  IF _apt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only cancel pending or confirmed appointments' USING ERRCODE = 'PGRST409';
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

-- Add missing foreign key constraints for data integrity
-- appointments.user_id should reference auth.users(id)
-- Note: Can't add FK to auth.users directly via REST, but we can document it should be there

-- At least make user_id NOT NULL explicit
ALTER TABLE public.appointments
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.appointments
ALTER COLUMN provider_id SET NOT NULL;

-- Add check constraint that user != provider
ALTER TABLE public.appointments
ADD CONSTRAINT check_user_not_provider CHECK (user_id != provider_id);
