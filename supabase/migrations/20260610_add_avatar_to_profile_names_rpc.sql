-- Add avatar_url to get_public_profile_names for browse page provider cards
DROP FUNCTION IF EXISTS public.get_public_profile_names(uuid[]);

CREATE OR REPLACE FUNCTION public.get_public_profile_names(profile_ids uuid[])
RETURNS TABLE(id uuid, full_name text, slug text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.slug, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(profile_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_names(uuid[]) TO anon;
