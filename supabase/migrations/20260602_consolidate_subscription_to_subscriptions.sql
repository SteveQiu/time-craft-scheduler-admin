-- Consolidate subscription state: move LS metadata from orgs to subscriptions.
-- orgs plan columns are NOT dropped yet (phase 2) to avoid breaking rollback.

-- Add LemonSqueezy metadata columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_event_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_subscription_id
  ON public.subscriptions(ls_subscription_id);

-- Backfill: copy LS metadata from orgs into subscriptions for existing rows
UPDATE public.subscriptions s
SET
  ls_subscription_id = COALESCE(s.ls_subscription_id, o.ls_subscription_id),
  ls_customer_id     = COALESCE(s.ls_customer_id, o.ls_customer_id)
FROM public.orgs o
WHERE o.id = s.user_id
  AND (o.ls_subscription_id IS NOT NULL OR o.ls_customer_id IS NOT NULL);

-- Ensure subscriptions table is in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
