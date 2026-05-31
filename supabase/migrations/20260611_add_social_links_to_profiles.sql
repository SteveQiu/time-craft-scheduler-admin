ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'social_twitter'
  ) THEN
    UPDATE public.profiles
    SET social_links = jsonb_strip_nulls(
      jsonb_build_object(
        'twitter', social_twitter,
        'instagram', social_instagram,
        'linkedin', social_linkedin,
        'facebook', social_facebook,
        'tiktok', social_tiktok,
        'youtube', social_youtube
      )
    )
    WHERE COALESCE(social_links, '{}'::jsonb) = '{}'::jsonb;
  END IF;
END $$;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS social_twitter,
  DROP COLUMN IF EXISTS social_instagram,
  DROP COLUMN IF EXISTS social_linkedin,
  DROP COLUMN IF EXISTS social_facebook,
  DROP COLUMN IF EXISTS social_tiktok,
  DROP COLUMN IF EXISTS social_youtube;

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
   profile_url text,
   social_links jsonb
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
    p.profile_url,
    COALESCE(p.social_links, '{}'::jsonb)
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
   profile_url text,
   social_links jsonb
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
    p.profile_url,
    COALESCE(p.social_links, '{}'::jsonb)
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;
