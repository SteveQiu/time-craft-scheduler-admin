-- Fix get_public_profile_by_id RPC to include all needed fields
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
  SELECT p.id, p.full_name, p.avatar_url, p.slug, p.introduction, p.email, p.phone, p.address, p.skills, p.hourly_rate, p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;
