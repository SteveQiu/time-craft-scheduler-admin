-- Persist user location preference (province/state + country) on the profile
-- so it follows the account across devices instead of living only in localStorage.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS country text;
