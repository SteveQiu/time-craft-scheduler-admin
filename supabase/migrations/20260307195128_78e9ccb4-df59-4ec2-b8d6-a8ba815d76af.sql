
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
  WHERE ow.status = 'invited'
    AND (
      ow.worker_email = _email
      OR ow.worker_email IN (
        SELECT pr.email FROM public.profiles pr WHERE pr.id = auth.uid()
      )
    );
$$;
