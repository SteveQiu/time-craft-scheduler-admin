-- API rate limits table — one row per user per day
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date    NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- Edge function uses service role key — no user-facing RLS policies needed.

-- Atomically increments the counter for today and returns the new count.
-- Called by the scheduler-api edge function before processing any request.
CREATE OR REPLACE FUNCTION public.increment_api_rate_limit(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.api_rate_limits (user_id, date, request_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$;

-- Clean up entries older than 90 days (run via pg_cron or a scheduled function)
CREATE OR REPLACE FUNCTION public.purge_old_api_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_rate_limits WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$;
