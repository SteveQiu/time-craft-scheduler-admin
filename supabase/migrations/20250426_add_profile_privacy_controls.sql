-- Add privacy control columns to profiles table
-- These columns define which fields are visible to other users

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills_public boolean DEFAULT true;

-- Update get_public_profile RPC to respect privacy settings
-- This function returns profile data for viewing by other users
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
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.slug,
    p.introduction,
    CASE WHEN p.email_public THEN p.email ELSE NULL END,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    CASE WHEN p.address_public THEN p.address ELSE NULL END,
    CASE WHEN p.skills_public THEN p.skills ELSE ARRAY[]::text[] END,
    CASE WHEN p.hourly_rate_public THEN p.hourly_rate ELSE 0 END,
    p.created_at
  FROM public.profiles p
  WHERE p.slug = profile_slug;
$$;

-- Update get_public_profile_by_id RPC to respect privacy settings
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
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.slug,
    p.introduction,
    CASE WHEN p.email_public THEN p.email ELSE NULL END,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    CASE WHEN p.address_public THEN p.address ELSE NULL END,
    CASE WHEN p.skills_public THEN p.skills ELSE ARRAY[]::text[] END,
    CASE WHEN p.hourly_rate_public THEN p.hourly_rate ELSE 0 END,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;

-- Add comment documenting the privacy fields
COMMENT ON COLUMN public.profiles.address_public IS 'If true, address is visible to other users';
COMMENT ON COLUMN public.profiles.phone_public IS 'If true, phone is visible to other users';
COMMENT ON COLUMN public.profiles.email_public IS 'If true, email is visible to other users';
COMMENT ON COLUMN public.profiles.hourly_rate_public IS 'If true, hourly_rate is visible to other users (default: true)';
COMMENT ON COLUMN public.profiles.skills_public IS 'If true, skills are visible to other users (default: true)';
