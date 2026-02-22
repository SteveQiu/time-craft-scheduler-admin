
CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, slug text, introduction text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.slug, p.introduction, p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;
