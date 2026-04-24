-- Data Rights and Consent Management Schema
-- Implements GDPR/CCPA-compliant data rights APIs

-- ==============================================
-- 1. CONSENT RECORDS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  privacy_policy_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  marketing_email BOOLEAN NOT NULL DEFAULT false,
  analytics BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_consent_records_user_id ON public.consent_records(user_id);
CREATE INDEX idx_consent_records_created_at ON public.consent_records(created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read/write their own consent records
CREATE POLICY "Users can view own consent records"
  ON public.consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records"
  ON public.consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- 2. USER PREFERENCES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly', 'never')),
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  data_retention_years INTEGER NOT NULL DEFAULT 7 CHECK (data_retention_years IN (1, 7)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read/update their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================
-- 3. DATA EXPORT JOBS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  scope TEXT NOT NULL CHECK (scope IN ('all', 'appointments', 'profile')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
  file_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  estimated_ready_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_exports_user_id ON public.data_exports(user_id);
CREATE INDEX idx_data_exports_status ON public.data_exports(status);
CREATE INDEX idx_data_exports_created_at ON public.data_exports(created_at DESC);

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own exports
CREATE POLICY "Users can view own data exports"
  ON public.data_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data exports"
  ON public.data_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- 4. DELETION REQUESTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  grace_period_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  can_cancel_until TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX idx_deletion_requests_user_id ON public.deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX idx_deletion_requests_scheduled_for ON public.deletion_requests(scheduled_for);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view/cancel their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deletion requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- ==============================================
-- 5. AUDIT LOGS TABLE (Enhanced)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ==============================================
-- 6. HELPER FUNCTIONS
-- ==============================================

-- Function: Log audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _resource TEXT DEFAULT NULL,
  _resource_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, metadata, ip_address, user_agent)
  VALUES (auth.uid(), _action, _resource, _resource_id, _metadata, _ip_address, _user_agent)
  RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- Function: Get user's personal data (GDPR Art. 15)
CREATE OR REPLACE FUNCTION public.get_user_personal_data(_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user_id UUID;
  _result JSONB;
BEGIN
  -- Use provided user_id or default to authenticated user
  _target_user_id := COALESCE(_user_id, auth.uid());
  
  -- Verify user can only access their own data
  IF _target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only access your own data';
  END IF;
  
  -- Build comprehensive user data JSON
  SELECT jsonb_build_object(
    'user_id', _target_user_id,
    'personal_info', (
      SELECT jsonb_build_object(
        'email', email,
        'full_name', full_name,
        'avatar_url', avatar_url,
        'created_at', created_at,
        'updated_at', updated_at
      )
      FROM public.profiles
      WHERE id = _target_user_id
    ),
    'roles', (
      SELECT jsonb_agg(role)
      FROM public.user_roles
      WHERE user_id = _target_user_id
    ),
    'appointments', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'start_time', start_time,
        'end_time', end_time,
        'service', service,
        'status', status,
        'notes', notes,
        'created_at', created_at
      ))
      FROM public.appointments
      WHERE user_id = _target_user_id OR provider_id = _target_user_id
    ),
    'consent_records', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'privacy_policy_accepted', privacy_policy_accepted,
        'terms_accepted', terms_accepted,
        'marketing_email', marketing_email,
        'analytics', analytics,
        'created_at', created_at
      ))
      FROM public.consent_records
      WHERE user_id = _target_user_id
    ),
    'preferences', (
      SELECT jsonb_build_object(
        'email_frequency', email_frequency,
        'analytics_enabled', analytics_enabled,
        'marketing_enabled', marketing_enabled,
        'data_retention_years', data_retention_years,
        'updated_at', updated_at
      )
      FROM public.user_preferences
      WHERE user_id = _target_user_id
    ),
    'bookmarks', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'provider_id', provider_id,
        'created_at', created_at
      ))
      FROM public.bookmarks
      WHERE user_id = _target_user_id
    ),
    'audit_logs', (
      SELECT jsonb_agg(jsonb_build_object(
        'action', action,
        'resource', resource,
        'created_at', created_at
      ))
      FROM public.audit_logs
      WHERE user_id = _target_user_id
      ORDER BY created_at DESC
      LIMIT 100
    )
  ) INTO _result;
  
  -- Log access
  PERFORM public.log_audit_event('data_access', 'user_data', _target_user_id);
  
  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_personal_data TO authenticated;

-- Function: Create data export job
CREATE OR REPLACE FUNCTION public.create_data_export(
  _format TEXT,
  _scope TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _export_id UUID;
  _estimated_ready TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Rate limiting: max 5 exports per day
  IF (
    SELECT COUNT(*)
    FROM public.data_exports
    WHERE user_id = auth.uid()
      AND created_at > now() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 5 data exports per 24 hours';
  END IF;
  
  -- Estimate completion time (5 minutes)
  _estimated_ready := now() + INTERVAL '5 minutes';
  
  -- Create export job
  INSERT INTO public.data_exports (user_id, format, scope, estimated_ready_at, expires_at)
  VALUES (
    auth.uid(),
    _format,
    _scope,
    _estimated_ready,
    now() + INTERVAL '7 days'
  )
  RETURNING id INTO _export_id;
  
  -- Log event
  PERFORM public.log_audit_event('data_export_requested', 'data_export', _export_id, 
    jsonb_build_object('format', _format, 'scope', _scope));
  
  RETURN _export_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_data_export TO authenticated;

-- Function: Request account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion(
  _reason TEXT DEFAULT NULL,
  _grace_period_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deletion_id UUID;
  _scheduled_for TIMESTAMP WITH TIME ZONE;
  _can_cancel_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Rate limiting: max 1 deletion request per month
  IF EXISTS (
    SELECT 1
    FROM public.deletion_requests
    WHERE user_id = auth.uid()
      AND status = 'pending'
      AND requested_at > now() - INTERVAL '30 days'
  ) THEN
    RAISE EXCEPTION 'Deletion request already pending';
  END IF;
  
  -- Calculate scheduling
  _scheduled_for := now() + (_grace_period_days || ' days')::INTERVAL;
  _can_cancel_until := _scheduled_for;
  
  -- Create deletion request
  INSERT INTO public.deletion_requests (
    user_id,
    reason,
    grace_period_days,
    scheduled_for,
    can_cancel_until
  )
  VALUES (
    auth.uid(),
    _reason,
    _grace_period_days,
    _scheduled_for,
    _can_cancel_until
  )
  RETURNING id INTO _deletion_id;
  
  -- Log event
  PERFORM public.log_audit_event('account_deletion_requested', 'deletion_request', _deletion_id,
    jsonb_build_object('grace_period_days', _grace_period_days, 'scheduled_for', _scheduled_for));
  
  RETURN _deletion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion TO authenticated;

-- Function: Cancel account deletion
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(_deletion_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deletion_record RECORD;
BEGIN
  -- Get deletion request
  SELECT * INTO _deletion_record
  FROM public.deletion_requests
  WHERE id = _deletion_id
    AND user_id = auth.uid()
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deletion request not found or already processed';
  END IF;
  
  -- Check if still within grace period
  IF now() > _deletion_record.can_cancel_until THEN
    RAISE EXCEPTION 'Grace period expired, cannot cancel deletion';
  END IF;
  
  -- Cancel deletion
  UPDATE public.deletion_requests
  SET status = 'cancelled',
      cancelled_at = now()
  WHERE id = _deletion_id;
  
  -- Log event
  PERFORM public.log_audit_event('account_deletion_cancelled', 'deletion_request', _deletion_id);
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion TO authenticated;

-- ==============================================
-- 7. TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 8. INITIAL DATA SEEDING
-- ==============================================

-- Create default preferences for all existing users
INSERT INTO public.user_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================
COMMENT ON TABLE public.consent_records IS 'Stores user consent choices for GDPR/CCPA compliance';
COMMENT ON TABLE public.user_preferences IS 'User privacy and communication preferences';
COMMENT ON TABLE public.data_exports IS 'Tracks data export jobs for GDPR Art. 15 right of access';
COMMENT ON TABLE public.deletion_requests IS 'Tracks account deletion requests with grace period';
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail of all data access and modifications';
