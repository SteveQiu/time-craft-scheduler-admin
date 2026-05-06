-- ============================================
-- AUDIT EVENTS TABLE (immutable log)
-- ============================================
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_id uuid,
  recipient_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_recipients ON public.audit_events USING GIN (recipient_ids);
CREATE INDEX idx_audit_events_actor ON public.audit_events (actor_id, created_at DESC);
CREATE INDEX idx_audit_events_created ON public.audit_events (created_at DESC);
CREATE INDEX idx_audit_events_entity ON public.audit_events (entity_type, entity_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit events they are involved in"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (auth.uid() = actor_id OR auth.uid() = ANY(recipient_ids));

CREATE POLICY "Admins can view all audit events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'INTERNAL_DEV'::app_role));

-- No INSERT/UPDATE/DELETE policies => only SECURITY DEFINER funcs/triggers can write.

-- ============================================
-- NOTIFICATION READS (per-user last_seen)
-- ============================================
CREATE TABLE public.notification_reads (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own read state"
  ON public.notification_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER: log_audit_event
-- ============================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _actor_id uuid,
  _recipient_ids uuid[],
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (event_type, entity_type, entity_id, actor_id, recipient_ids, metadata)
  VALUES (_event_type, _entity_type, _entity_id, _actor_id, COALESCE(_recipient_ids, '{}'::uuid[]), COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- ============================================
-- TRIGGER: appointments lifecycle
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _recipients uuid[];
  _event text;
  _meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event := 'appointment.created';
    _recipients := ARRAY[NEW.user_id, NEW.provider_id];
    _meta := jsonb_build_object('worker', NEW.worker, 'service', NEW.service, 'date', NEW.date, 'start_time', NEW.start_time);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _event := 'appointment.' || NEW.status;
    _recipients := ARRAY[NEW.user_id, NEW.provider_id];
    _meta := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'worker', NEW.worker, 'date', NEW.date);
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.log_audit_event(_event, 'appointment', NEW.id, _actor, _recipients, _meta);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_appointments
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.audit_appointments();

-- ============================================
-- TRIGGER: openings
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_openings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _row record;
  _event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event := 'opening.created'; _row := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _event := 'opening.updated'; _row := NEW;
  ELSE
    _event := 'opening.deleted'; _row := OLD;
  END IF;

  PERFORM public.log_audit_event(
    _event, 'opening', _row.id, _actor,
    ARRAY[_row.user_id]::uuid[],
    jsonb_build_object('worker', _row.worker, 'service', _row.service, 'date', _row.date, 'start_time', _row.start_time)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_openings
AFTER INSERT OR UPDATE OR DELETE ON public.openings
FOR EACH ROW EXECUTE FUNCTION public.audit_openings();

-- ============================================
-- TRIGGER: reviews
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    'review.created', 'review', NEW.id, NEW.reviewer_id,
    ARRAY[NEW.reviewer_id, NEW.reviewed_id]::uuid[],
    jsonb_build_object('rating', NEW.rating, 'appointment_id', NEW.appointment_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_reviews
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.audit_reviews();

-- ============================================
-- TRIGGER: reports
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    'report.created', 'report', NEW.id, NEW.reporter_id,
    ARRAY[NEW.reporter_id]::uuid[],
    jsonb_build_object('category', NEW.category)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_reports
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.audit_reports();

-- ============================================
-- TRIGGER: user_roles
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _event text;
BEGIN
  IF TG_OP = 'INSERT' THEN _event := 'role.granted'; _row := NEW;
  ELSE _event := 'role.revoked'; _row := OLD;
  END IF;

  PERFORM public.log_audit_event(
    _event, 'user_role', _row.id, auth.uid(),
    ARRAY[_row.user_id]::uuid[],
    jsonb_build_object('role', _row.role)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

-- ============================================
-- RPCs for the frontend
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_notifications(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  event_type text,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz,
  is_unread boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _last_seen timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_seen_at INTO _last_seen FROM public.notification_reads WHERE user_id = _uid;
  _last_seen := COALESCE(_last_seen, 'epoch'::timestamptz);

  RETURN QUERY
  SELECT ae.id, ae.event_type, ae.entity_type, ae.entity_id, ae.actor_id,
         ae.metadata, ae.created_at,
         (ae.created_at > _last_seen) AS is_unread
  FROM public.audit_events ae
  WHERE _uid = ANY(ae.recipient_ids)
    AND ae.actor_id IS DISTINCT FROM _uid  -- don't notify yourself for your own actions
  ORDER BY ae.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _last_seen timestamptz;
  _count int;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;

  SELECT last_seen_at INTO _last_seen FROM public.notification_reads WHERE user_id = _uid;
  _last_seen := COALESCE(_last_seen, 'epoch'::timestamptz);

  SELECT count(*) INTO _count
  FROM public.audit_events ae
  WHERE _uid = ANY(ae.recipient_ids)
    AND ae.actor_id IS DISTINCT FROM _uid
    AND ae.created_at > _last_seen;

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.notification_reads (user_id, last_seen_at, updated_at)
  VALUES (_uid, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_seen_at = EXCLUDED.last_seen_at, updated_at = now();
END;
$$;
