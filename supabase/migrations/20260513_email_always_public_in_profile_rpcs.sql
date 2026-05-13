-- Email is always visible on public profiles per product decision.
-- Remove the email_public gate from both profile lookup RPCs.

DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_slug text)
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
   created_at timestamp with time zone,
   profile_url text
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
    p.email,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    CASE WHEN p.address_public THEN p.address ELSE NULL END,
    CASE WHEN p.skills_public THEN p.skills ELSE ARRAY[]::text[] END,
    CASE WHEN p.hourly_rate_public THEN p.hourly_rate ELSE 0 END,
    p.created_at,
    p.profile_url
  FROM public.profiles p
  WHERE p.slug = profile_slug;
$$;

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
   created_at timestamp with time zone,
   profile_url text
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
    p.email,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    CASE WHEN p.address_public THEN p.address ELSE NULL END,
    CASE WHEN p.skills_public THEN p.skills ELSE ARRAY[]::text[] END,
    CASE WHEN p.hourly_rate_public THEN p.hourly_rate ELSE 0 END,
    p.created_at,
    p.profile_url
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;
