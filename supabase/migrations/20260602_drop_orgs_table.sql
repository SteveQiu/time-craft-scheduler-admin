-- Phase 2: Drop orgs table — all subscription state now lives in public.subscriptions.
-- No runtime code references this table anymore.
DROP TABLE IF EXISTS public.orgs;
