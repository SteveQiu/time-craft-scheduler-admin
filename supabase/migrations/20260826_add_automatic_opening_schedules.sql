CREATE TABLE public.automatic_opening_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME,
  duration NUMERIC NOT NULL CHECK (duration > 0),
  interval_hours NUMERIC NOT NULL CHECK (interval_hours > 0),
  multiple_slots BOOLEAN NOT NULL DEFAULT false,
  weekdays SMALLINT[] NOT NULL CHECK (
    cardinality(weekdays) > 0
    AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
  ),
  worker TEXT NOT NULL,
  service TEXT NOT NULL,
  location TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  accepted_payment_method_ids TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT multiple_slots OR end_time IS NOT NULL),
  CHECK (NOT multiple_slots OR end_time > start_time),
  CHECK (
    multiple_slots
    OR DATE '2000-01-01' + start_time + duration * INTERVAL '1 hour'
      < TIMESTAMP '2000-01-02 00:00:00'
  )
);

ALTER TABLE public.automatic_opening_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their automatic opening templates"
  ON public.automatic_opening_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their automatic opening templates"
  ON public.automatic_opening_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_user_premium(auth.uid())
  );

CREATE POLICY "Users can update their automatic opening templates"
  ON public.automatic_opening_templates
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.is_user_premium(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_user_premium(auth.uid())
  );

CREATE POLICY "Users can delete their automatic opening templates"
  ON public.automatic_opening_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_automatic_opening_templates_user_active
  ON public.automatic_opening_templates(user_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.automatic_opening_templates
  TO authenticated;

CREATE TRIGGER update_automatic_opening_templates_updated_at
  BEFORE UPDATE ON public.automatic_opening_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.openings
  ADD COLUMN automatic_template_id UUID
  REFERENCES public.automatic_opening_templates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_openings_automatic_template_slot
  ON public.openings(automatic_template_id, date, start_time)
  WHERE automatic_template_id IS NOT NULL;

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
  schedule_end_date DATE := (current_date + INTERVAL '1 year')::DATE;
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
            VALUES (
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
          VALUES (
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

REVOKE ALL ON FUNCTION public.maintain_automatic_openings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maintain_automatic_openings() TO authenticated;
