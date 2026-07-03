/*
  Consolidate public profile address storage.

  DESTRUCTIVE: drops public.profiles.address after moving public display to
  public.profiles.public_address_id -> public.workplace_addresses.id.

  Backfill is best-effort: profiles.address is matched to same-user
  workplace_addresses.address formatted display text. Unmatched rows remain NULL;
  users must re-select public address.
*/

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_address_id uuid REFERENCES public.workplace_addresses(id) ON DELETE SET NULL;

UPDATE public.profiles p
SET public_address_id = (
  SELECT wa.id
  FROM public.workplace_addresses wa
  WHERE wa.user_id = p.id
    AND concat_ws(
      ', ',
      NULLIF(COALESCE(wa.address::jsonb->>'address_line_1', wa.address::jsonb->>'street'), ''),
      NULLIF(wa.address::jsonb->>'address_line_2', ''),
      NULLIF(wa.address::jsonb->>'city', ''),
      NULLIF(wa.address::jsonb->>'province', ''),
      NULLIF(wa.address::jsonb->>'country', ''),
      NULLIF(wa.address::jsonb->>'zip', '')
    ) = p.address
  ORDER BY wa.is_default DESC, wa.created_at ASC, wa.id ASC
  LIMIT 1
)
WHERE p.address IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.workplace_addresses wa
    WHERE wa.user_id = p.id
      AND concat_ws(
        ', ',
        NULLIF(COALESCE(wa.address::jsonb->>'address_line_1', wa.address::jsonb->>'street'), ''),
        NULLIF(wa.address::jsonb->>'address_line_2', ''),
        NULLIF(wa.address::jsonb->>'city', ''),
        NULLIF(wa.address::jsonb->>'province', ''),
        NULLIF(wa.address::jsonb->>'country', ''),
        NULLIF(wa.address::jsonb->>'zip', '')
      ) = p.address
  );

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
    CASE WHEN p.address_public THEN (SELECT concat_ws(', ', NULLIF(COALESCE(wa.address::jsonb->>'address_line_1', wa.address::jsonb->>'street'),''), NULLIF(wa.address::jsonb->>'address_line_2',''), NULLIF(wa.address::jsonb->>'city',''), NULLIF(wa.address::jsonb->>'province',''), NULLIF(wa.address::jsonb->>'country',''), NULLIF(wa.address::jsonb->>'zip','')) FROM public.workplace_addresses wa WHERE wa.id = p.public_address_id) ELSE NULL END,
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
    CASE WHEN p.address_public THEN (SELECT concat_ws(', ', NULLIF(COALESCE(wa.address::jsonb->>'address_line_1', wa.address::jsonb->>'street'),''), NULLIF(wa.address::jsonb->>'address_line_2',''), NULLIF(wa.address::jsonb->>'city',''), NULLIF(wa.address::jsonb->>'province',''), NULLIF(wa.address::jsonb->>'country',''), NULLIF(wa.address::jsonb->>'zip','')) FROM public.workplace_addresses wa WHERE wa.id = p.public_address_id) ELSE NULL END,
    CASE WHEN p.skills_public THEN p.skills ELSE ARRAY[]::text[] END,
    CASE WHEN p.hourly_rate_public THEN p.hourly_rate ELSE 0 END,
    p.created_at,
    p.profile_url,
    COALESCE(p.social_links, '{}'::jsonb)
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS address;

COMMIT;
