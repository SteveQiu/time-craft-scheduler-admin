CREATE OR REPLACE FUNCTION public.maintain_automatic_openings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  template_record public.automatic_opening_templates%ROWTYPE;
  schedule_date DATE;
  schedule_end_date DATE := (current_date + INTERVAL '1 month')::DATE;
  slot_start TIMESTAMP;
  slot_end TIMESTAMP;
  slot_boundary TIMESTAMP;
  inserted_count INTEGER := 0;
  row_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = current_user_id
      AND plan_type IN ('premium', 'pro')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Premium subscription required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));

  DELETE FROM public.openings opening
  USING public.automatic_opening_templates template
  WHERE opening.automatic_template_id = template.id
    AND template.user_id = current_user_id
    AND opening.is_available = true
    AND opening.date > schedule_end_date;

  FOR template_record IN
    SELECT *
    FROM public.automatic_opening_templates
    WHERE user_id = current_user_id
      AND is_active = true
  LOOP
    schedule_date := current_date;

    WHILE schedule_date <= schedule_end_date LOOP
      IF extract(dow FROM schedule_date)::SMALLINT = ANY(template_record.weekdays) THEN
        IF template_record.multiple_slots THEN
          slot_start := schedule_date + template_record.start_time;
          slot_boundary := schedule_date + template_record.end_time;

          WHILE slot_start + template_record.interval_hours * INTERVAL '1 hour' <= slot_boundary LOOP
            slot_end := slot_start + template_record.interval_hours * INTERVAL '1 hour';

            INSERT INTO public.openings (
              user_id,
              date,
              start_time,
              end_time,
              duration,
              worker,
              service,
              location,
              is_available,
              hourly_rate,
              total,
              accepted_payment_method_ids,
              automatic_template_id
            )
            SELECT
              current_user_id,
              schedule_date,
              slot_start::TIME,
              slot_end::TIME,
              template_record.interval_hours,
              template_record.worker,
              template_record.service,
              template_record.location,
              true,
              template_record.hourly_rate,
              template_record.total,
              template_record.accepted_payment_method_ids,
              template_record.id
            WHERE NOT EXISTS (
              SELECT 1
              FROM public.openings existing
              WHERE existing.user_id = current_user_id
                AND existing.date = schedule_date
                AND existing.start_time = slot_start::TIME
                AND existing.worker = template_record.worker
            )
            ON CONFLICT (automatic_template_id, date, start_time)
              WHERE automatic_template_id IS NOT NULL
              DO NOTHING;

            GET DIAGNOSTICS row_count = ROW_COUNT;
            inserted_count := inserted_count + row_count;
            slot_start := slot_end;
          END LOOP;
        ELSE
          INSERT INTO public.openings (
            user_id,
            date,
            start_time,
            end_time,
            duration,
            worker,
            service,
            location,
            is_available,
            hourly_rate,
            total,
            accepted_payment_method_ids,
            automatic_template_id
          )
          SELECT
            current_user_id,
            schedule_date,
            template_record.start_time,
            (template_record.start_time + template_record.duration * INTERVAL '1 hour')::TIME,
            template_record.duration,
            template_record.worker,
            template_record.service,
            template_record.location,
            true,
            template_record.hourly_rate,
            template_record.total,
            template_record.accepted_payment_method_ids,
            template_record.id
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.openings existing
            WHERE existing.user_id = current_user_id
              AND existing.date = schedule_date
              AND existing.start_time = template_record.start_time
              AND existing.worker = template_record.worker
          )
          ON CONFLICT (automatic_template_id, date, start_time)
            WHERE automatic_template_id IS NOT NULL
            DO NOTHING;

          GET DIAGNOSTICS row_count = ROW_COUNT;
          inserted_count := inserted_count + row_count;
        END IF;
      END IF;

      schedule_date := schedule_date + 1;
    END LOOP;
  END LOOP;

  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_automatic_opening_schedule(
  p_template_id UUID,
  p_start_time TIME,
  p_end_time TIME,
  p_duration NUMERIC,
  p_interval_hours NUMERIC,
  p_multiple_slots BOOLEAN,
  p_weekdays SMALLINT[],
  p_worker TEXT,
  p_service TEXT,
  p_location TEXT,
  p_hourly_rate NUMERIC,
  p_total NUMERIC,
  p_accepted_payment_method_ids TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  saved_template_id UUID;
  inserted_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = current_user_id
      AND plan_type IN ('premium', 'pro')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Premium subscription required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));

  IF p_template_id IS NULL THEN
    INSERT INTO public.automatic_opening_templates (
      user_id,
      start_time,
      end_time,
      duration,
      interval_hours,
      multiple_slots,
      weekdays,
      worker,
      service,
      location,
      hourly_rate,
      total,
      accepted_payment_method_ids
    )
    VALUES (
      current_user_id,
      p_start_time,
      p_end_time,
      p_duration,
      p_interval_hours,
      p_multiple_slots,
      p_weekdays,
      p_worker,
      p_service,
      p_location,
      p_hourly_rate,
      p_total,
      p_accepted_payment_method_ids
    )
    RETURNING id INTO saved_template_id;
  ELSE
    UPDATE public.automatic_opening_templates
    SET
      start_time = p_start_time,
      end_time = p_end_time,
      duration = p_duration,
      interval_hours = p_interval_hours,
      multiple_slots = p_multiple_slots,
      weekdays = p_weekdays,
      worker = p_worker,
      service = p_service,
      location = p_location,
      hourly_rate = p_hourly_rate,
      total = p_total,
      accepted_payment_method_ids = p_accepted_payment_method_ids
    WHERE id = p_template_id
      AND user_id = current_user_id
    RETURNING id INTO saved_template_id;

    IF saved_template_id IS NULL THEN
      RAISE EXCEPTION 'Automatic opening template not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.openings
  WHERE automatic_template_id = saved_template_id
    AND is_available = true;

  inserted_count := public.maintain_automatic_openings();
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.save_automatic_opening_schedule(
  UUID,
  TIME,
  TIME,
  NUMERIC,
  NUMERIC,
  BOOLEAN,
  SMALLINT[],
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_automatic_opening_schedule(
  UUID,
  TIME,
  TIME,
  NUMERIC,
  NUMERIC,
  BOOLEAN,
  SMALLINT[],
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT[]
) TO authenticated;
