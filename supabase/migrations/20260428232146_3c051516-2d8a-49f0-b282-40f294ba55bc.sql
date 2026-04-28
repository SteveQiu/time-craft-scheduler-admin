DROP POLICY IF EXISTS "Users can view appointment participant profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, slug text, introduction text, email text, phone text, address text, skills text[], hourly_rate numeric, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, 
    p.full_name, 
    p.avatar_url, 
    p.slug, 
    p.introduction,
    CASE WHEN p.id = auth.uid() OR COALESCE(p.email_public, false) THEN p.email ELSE NULL END,
    CASE WHEN p.id = auth.uid() OR COALESCE(p.phone_public, false) THEN p.phone ELSE NULL END,
    CASE WHEN p.id = auth.uid() OR COALESCE(p.address_public, false) THEN p.address ELSE NULL END,
    CASE WHEN p.id = auth.uid() OR COALESCE(p.skills_public, true) THEN p.skills ELSE '{}'::text[] END,
    CASE WHEN p.id = auth.uid() OR COALESCE(p.hourly_rate_public, true) THEN p.hourly_rate ELSE NULL END,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
$function$;