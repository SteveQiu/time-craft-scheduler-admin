
DROP FUNCTION public.get_public_profile_names(uuid[]);

CREATE FUNCTION public.get_public_profile_names(profile_ids uuid[])
RETURNS TABLE(id uuid, full_name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.slug
  FROM public.profiles p
  WHERE p.id = ANY(profile_ids);
$$;
