
-- =============================================
-- FIX 1: Profiles PII Exposure
-- =============================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own full profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can view profiles of their appointment participants (for contact info)
CREATE POLICY "Users can view appointment participant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE (appointments.user_id = auth.uid() AND appointments.provider_id = profiles.id)
         OR (appointments.provider_id = auth.uid() AND appointments.user_id = profiles.id)
    )
  );

-- Create a public view with only safe fields for browsing
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, avatar_url, slug, introduction, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- =============================================
-- FIX 2: Appointment Status Escalation
-- =============================================

-- Add trigger to validate appointment updates
CREATE OR REPLACE FUNCTION public.validate_appointment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent changing immutable fields
  IF OLD.user_id IS DISTINCT FROM NEW.user_id 
     OR OLD.provider_id IS DISTINCT FROM NEW.provider_id 
     OR OLD.opening_id IS DISTINCT FROM NEW.opening_id THEN
    RAISE EXCEPTION 'Cannot modify appointment parties or opening';
  END IF;

  -- If only status changed, validate transitions
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Booker (user_id) can only cancel pending/confirmed appointments
    IF auth.uid() = OLD.user_id AND auth.uid() != OLD.provider_id THEN
      IF NEW.status != 'cancelled' OR OLD.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Users can only cancel pending or confirmed appointments';
      END IF;
    END IF;

    -- Provider can: pending->confirmed/cancelled, confirmed->completed/cancelled
    IF auth.uid() = OLD.provider_id THEN
      IF NOT (
        (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled')) OR
        (OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled'))
      ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_update
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_update();

-- =============================================
-- FIX 3: User Roles Exposure
-- =============================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Users can only view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
