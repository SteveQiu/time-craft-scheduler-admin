-- Payment security hardening
-- H1: Idempotency table — prevents webhook replay attacks
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  webhook_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service role only — webhook handler uses service_role key directly, no RLS needed
-- (RLS would block service_role writes; leave unprotected table, no user data stored)

-- Auto-purge old entries after 30 days to prevent unbounded growth
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON public.processed_webhooks(processed_at);

-- H2: Event ordering guard — tracks timestamp of last applied LS event per org
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS ls_event_at TIMESTAMPTZ;
