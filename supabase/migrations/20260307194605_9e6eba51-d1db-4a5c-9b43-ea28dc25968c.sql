
-- Create invite status enum
CREATE TYPE public.worker_invite_status AS ENUM ('invited', 'accepted', 'declined');

-- Create org_workers table
CREATE TABLE public.org_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_email TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  phone TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  status worker_invite_status NOT NULL DEFAULT 'invited',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, worker_email)
);

-- Enable RLS
ALTER TABLE public.org_workers ENABLE ROW LEVEL SECURITY;

-- Org owners can manage their workers
CREATE POLICY "Org owners can view own workers"
  ON public.org_workers FOR SELECT
  USING (auth.uid() = org_id);

CREATE POLICY "Org owners can insert workers"
  ON public.org_workers FOR INSERT
  WITH CHECK (auth.uid() = org_id);

CREATE POLICY "Org owners can update own workers"
  ON public.org_workers FOR UPDATE
  USING (auth.uid() = org_id);

CREATE POLICY "Org owners can delete own workers"
  ON public.org_workers FOR DELETE
  USING (auth.uid() = org_id);

-- Workers can view their own invites (by email match or user_id)
CREATE POLICY "Workers can view own invites"
  ON public.org_workers FOR SELECT
  USING (auth.uid() = user_id);

-- Workers can update their own invite (to accept/decline)
CREATE POLICY "Workers can update own invite"
  ON public.org_workers FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_org_workers_updated_at
  BEFORE UPDATE ON public.org_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: get org_id for a worker user
CREATE OR REPLACE FUNCTION public.get_worker_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_workers
  WHERE user_id = _user_id AND status = 'accepted'
  LIMIT 1;
$$;

-- Helper: check if user is worker of a given org
CREATE OR REPLACE FUNCTION public.is_worker_of(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_workers
    WHERE user_id = _user_id AND org_id = _org_id AND status = 'accepted'
  );
$$;

-- Update openings RLS: workers can view org openings
CREATE POLICY "Workers can view org openings"
  ON public.openings FOR SELECT
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can create org openings"
  ON public.openings FOR INSERT
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can update org openings"
  ON public.openings FOR UPDATE
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can delete org openings"
  ON public.openings FOR DELETE
  USING (public.is_worker_of(auth.uid(), user_id));

-- Update appointments RLS: workers can view/update org appointments
CREATE POLICY "Workers can view org appointments"
  ON public.appointments FOR SELECT
  USING (public.is_worker_of(auth.uid(), provider_id));

CREATE POLICY "Workers can update org appointments"
  ON public.appointments FOR UPDATE
  USING (public.is_worker_of(auth.uid(), provider_id));

-- Update workplace_addresses RLS: workers can view/manage org addresses
CREATE POLICY "Workers can view org addresses"
  ON public.workplace_addresses FOR SELECT
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can create org addresses"
  ON public.workplace_addresses FOR INSERT
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can update org addresses"
  ON public.workplace_addresses FOR UPDATE
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can delete org addresses"
  ON public.workplace_addresses FOR DELETE
  USING (public.is_worker_of(auth.uid(), user_id));

-- Update payment_methods RLS: workers can view/manage org payment methods
CREATE POLICY "Workers can view org payment methods"
  ON public.payment_methods FOR SELECT
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can create org payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can update org payment methods"
  ON public.payment_methods FOR UPDATE
  USING (public.is_worker_of(auth.uid(), user_id));

CREATE POLICY "Workers can delete org payment methods"
  ON public.payment_methods FOR DELETE
  USING (public.is_worker_of(auth.uid(), user_id));

-- Function to find pending invites by email (for workers to see their invites)
CREATE OR REPLACE FUNCTION public.get_my_invites(_email TEXT)
RETURNS TABLE(id UUID, org_id UUID, org_name TEXT, worker_name TEXT, status worker_invite_status, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ow.id, ow.org_id, p.full_name as org_name, ow.worker_name, ow.status, ow.created_at
  FROM public.org_workers ow
  JOIN public.profiles p ON p.id = ow.org_id
  WHERE ow.worker_email = _email AND ow.status = 'invited';
$$;

-- Function to accept an invite
CREATE OR REPLACE FUNCTION public.accept_invite(_invite_id UUID, _user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.org_workers
  SET status = 'accepted', user_id = _user_id
  WHERE id = _invite_id AND status = 'invited';
END;
$$;
