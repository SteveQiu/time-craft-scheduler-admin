-- Allow customers to reschedule confirmed appointments
-- When modified, old appointment is cancelled and new pending appointment is created
-- Provider must re-approve the new time

CREATE OR REPLACE FUNCTION public.modify_appointment(
  appointment_id UUID,
  new_opening_id UUID,
  caller_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment RECORD;
  v_old_opening_id UUID;
  v_new_opening RECORD;
  v_new_appointment_id UUID;
BEGIN
  -- Verify appointment exists and belongs to caller (booker)
  SELECT * INTO v_appointment FROM appointments 
  WHERE id = appointment_id AND user_id = caller_id;
  
  IF v_appointment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Appointment not found or you do not have permission to modify it'
    );
  END IF;

  -- Allow modification of pending or confirmed appointments
  IF v_appointment.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending or confirmed appointments can be modified'
    );
  END IF;

  -- Get the old opening ID
  v_old_opening_id := v_appointment.opening_id;

  -- Verify new opening exists and is available
  SELECT * INTO v_new_opening FROM openings 
  WHERE id = new_opening_id AND status = 'open';
  
  IF v_new_opening IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New opening is not available'
    );
  END IF;

  -- Ensure it's the same worker and service
  IF v_new_opening.worker_id != v_appointment.worker_id 
     OR v_new_opening.service_id != v_appointment.service_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New opening must be for the same worker and service'
    );
  END IF;

  -- Cancel old appointment
  UPDATE appointments SET status = 'cancelled' WHERE id = appointment_id;

  -- Create new pending appointment (provider must re-approve)
  INSERT INTO appointments (
    user_id, opening_id, worker_id, service_id, status, 
    original_opening_id
  )
  VALUES (
    v_appointment.user_id,
    new_opening_id,
    v_appointment.worker_id,
    v_appointment.service_id,
    'pending',
    new_opening_id
  )
  RETURNING id INTO v_new_appointment_id;

  -- Re-open old opening if no other confirmed bookings
  IF NOT EXISTS (
    SELECT 1 FROM appointments 
    WHERE opening_id = v_old_opening_id 
    AND status = 'confirmed'
    AND id != appointment_id
  ) THEN
    UPDATE openings SET status = 'open' WHERE id = v_old_opening_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_appointment_id', v_new_appointment_id,
    'message', 'Appointment rescheduled. The provider will review your new appointment.'
  );
END;
$$;
