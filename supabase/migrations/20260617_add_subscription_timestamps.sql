-- Create orgs table if it doesn't exist, then add subscription tracking fields
CREATE TABLE IF NOT EXISTS public.orgs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';

CREATE INDEX IF NOT EXISTS idx_orgs_ls_subscription_id ON public.orgs(ls_subscription_id);

-- Enable RLS
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Users can read their own org record
DROP POLICY IF EXISTS "orgs_select_own" ON public.orgs;
CREATE POLICY "orgs_select_own" ON public.orgs
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own org record
DROP POLICY IF EXISTS "orgs_insert_own" ON public.orgs;
CREATE POLICY "orgs_insert_own" ON public.orgs
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own org record
DROP POLICY IF EXISTS "orgs_update_own" ON public.orgs;
CREATE POLICY "orgs_update_own" ON public.orgs
  FOR UPDATE USING (auth.uid() = id);
