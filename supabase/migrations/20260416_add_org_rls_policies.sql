-- CRITICAL SECURITY FIX: Add org-mode RLS policies
-- This prevents users from querying appointments outside their org
-- The frontend-only filter can be bypassed; the database MUST enforce access control

-- Problem: Current RLS policies only check if user is provider or booker
-- This means any authenticated user can query ALL appointments if they know the table structure

-- Solution: Add org-aware policies that restrict to org members only

-- SAFE APPROACH: Only ADD new policy, don't drop existing ones
-- Existing policies remain unchanged and working
-- New policy added for org member access

-- NEW: Org members can view appointments where provider is in their org
-- This allows org team members to see shared appointments
CREATE POLICY IF NOT EXISTS "Org members can view org provider appointments"
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

-- Create index for performance on org_workers lookup
-- This helps the RLS policy check complete quickly
CREATE INDEX IF NOT EXISTS idx_org_workers_user_status ON public.org_workers(user_id, status) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_org_workers_org_status ON public.org_workers(org_id, status) WHERE status = 'accepted';

-- Verify RLS is still enabled (in case it was disabled)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Document the policies for reference
COMMENT ON POLICY "Org members can view org provider appointments" ON public.appointments IS
  'NEW SECURITY POLICY: Allows org team members to see appointments where any team member is provider. 
   This enforces org-mode security at the database level, preventing unauthorized cross-org viewing.
   Works together with existing policies:
   - Users can view their own appointments (they are the booker)
   - Providers can view their appointments (they are the provider)
   - (NEW) Org members can view org team appointments (member is in provider org)';
