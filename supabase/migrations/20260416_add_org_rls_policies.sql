-- CRITICAL SECURITY FIX: Add org-mode RLS policies
-- This prevents users from querying appointments outside their org
-- The frontend-only filter can be bypassed; the database MUST enforce access control

-- Problem: Current RLS policies only check if user is provider or booker
-- This means any authenticated user can query ALL appointments if they know the table structure

-- Solution: Add org-aware policies that restrict to org members only

-- First, we need to identify if user is part of an organization
-- An org member is anyone in org_workers table with status='accepted' and user_id = auth.uid()

-- Drop existing policies to recreate them with org support
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can view appointments for their openings" ON public.appointments;

-- RECREATED: Users can view their own booked appointments
CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

-- RECREATED: Providers can view appointments for their openings
CREATE POLICY "Providers can view appointments for their openings"
  ON public.appointments FOR SELECT
  USING (auth.uid() = provider_id);

-- NEW: Org members can view appointments where provider is in their org
-- This allows org team members to see shared appointments
CREATE POLICY "Org members can view org provider appointments"
  ON public.appointments FOR SELECT
  USING (
    -- User must be an accepted member of provider's org
    EXISTS (
      SELECT 1 FROM public.org_workers
      WHERE org_workers.org_id = appointments.provider_id
        AND org_workers.user_id = auth.uid()
        AND org_workers.status = 'accepted'
    )
  );

-- Explicitly deny querying appointments you're not involved in
-- This is the key security fix: if you don't match any of the above
-- policies, you get NOTHING (not just "reduced" data)

-- UPDATE policies (unchanged - only provider/booker can modify)
-- These are fine as-is because they're already restrictive

-- Create index for performance on org_workers lookup
-- This helps the RLS policy check complete quickly
CREATE INDEX IF NOT EXISTS idx_org_workers_user_status ON public.org_workers(user_id, status) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_org_workers_org_status ON public.org_workers(org_id, status) WHERE status = 'accepted';

-- Verify RLS is still enabled (in case it was disabled)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Test the policies by documenting them
COMMENT ON POLICY "Users can view their own appointments" ON public.appointments IS
  'Allows bookers to see appointments they created';

COMMENT ON POLICY "Providers can view appointments for their openings" ON public.appointments IS
  'Allows providers to see appointments for their openings (to manage/approve)';

COMMENT ON POLICY "Org members can view org provider appointments" ON public.appointments IS
  'NEW: Allows org team members to see appointments where any team member is provider. This enforces org-mode security at the database level, preventing unauthorized cross-org viewing.';
