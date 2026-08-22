-- Fix get_public_profile_by_id RPC to include all needed fields with privacy guards
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
 RETURNS TABLE(
   id uuid,
   full_name text,
   avatar_url text,
   slug text,
   introduction text,
   email text,
   phone text,
   address text,
   skills text[],
   hourly_rate numeric,
   created_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.slug,
    p.introduction,
    CASE WHEN p.email_public   THEN p.email   END AS email,
    CASE WHEN p.phone_public   THEN p.phone   END AS phone,
    CASE WHEN p.address_public THEN p.address END AS address,
    CASE WHEN COALESCE(p.skills_public, true) THEN p.skills END AS skills,
    CASE WHEN COALESCE(p.hourly_rate_public, true) THEN p.hourly_rate END AS hourly_rate,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;
