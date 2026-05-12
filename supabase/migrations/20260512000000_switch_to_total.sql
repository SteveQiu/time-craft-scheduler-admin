-- Switch openings + appointments to store `total` as the source of truth.
-- Hourly rate is still kept on these tables for backward-compat / rollback safety.
-- profiles.hourly_rate is intentionally untouched — that remains the per-worker $/hr default.

-- 1. openings.total ------------------------------------------------------------
ALTER TABLE openings ADD COLUMN IF NOT EXISTS total numeric(10,2) NOT NULL DEFAULT 0;

-- Backfill from legacy rate × duration where total hasn't been set yet
UPDATE openings
SET total = COALESCE(hourly_rate, 0) * COALESCE(duration, 0)
WHERE total = 0;

-- 2. appointments.total --------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total numeric(10,2) NOT NULL DEFAULT 0;

UPDATE appointments
SET total = COALESCE(hourly_rate, 0) * COALESCE(duration, 0)
WHERE total = 0;

-- 3. book_opening RPC ----------------------------------------------------------
-- Persist BOTH `total` (new source of truth) and `hourly_rate` (back-compat).
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
  _booked_total numeric(10,2);
  _booked_rate  numeric(10,2);
BEGIN
  -- Lock the opening row to prevent concurrent access
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

  SELECT COUNT(*) INTO _existing_pending_count
  FROM appointments
  WHERE opening_id = _opening_id
    AND user_id = _user_id
    AND status = 'pending';

  IF _existing_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening';
  END IF;

  -- Total is the source of truth; fall back to legacy rate×duration if zero.
  _booked_total := COALESCE(NULLIF(_opening.total, 0),
                            COALESCE(_opening.hourly_rate, 0) * COALESCE(_opening.duration, 0));
  -- Derived rate kept for back-compat consumers reading `hourly_rate`.
  _booked_rate  := CASE
                     WHEN COALESCE(_opening.duration, 0) > 0
                       THEN _booked_total / _opening.duration
                     ELSE 0
                   END;

  INSERT INTO appointments (
    opening_id, user_id, provider_id, worker, service, location,
    date, start_time, end_time, duration, status, hourly_rate, total
  )
  VALUES (
    _opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location,
    _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending',
    _booked_rate, _booked_total
  )
  RETURNING id INTO _appointment_id;

  UPDATE openings SET is_available = false WHERE id = _opening_id;

  RETURN _appointment_id;
END;
$$;

-- 4. get_appointment_totals RPC ------------------------------------------------
-- Mirror of get_appointment_rates but returns the persisted total.
-- Sources from appointments.total → opening.total → rate×duration fallback.
CREATE OR REPLACE FUNCTION public.get_appointment_totals(_appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    COALESCE(
      NULLIF(a.total, 0),
      NULLIF(o.total, 0),
      NULLIF(a.hourly_rate, 0) * COALESCE(a.duration, 0),
      NULLIF(o.hourly_rate, 0) * COALESCE(a.duration, 0),
      0::numeric
    ) AS total
  FROM appointments a
  LEFT JOIN openings o ON a.opening_id = o.id
  WHERE a.id = ANY(_appointment_ids)
    AND (a.user_id = auth.uid() OR a.provider_id = auth.uid());
END;
$$;
