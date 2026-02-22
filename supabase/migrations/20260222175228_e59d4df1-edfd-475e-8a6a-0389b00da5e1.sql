
-- Fix SECURITY DEFINER view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT id, full_name, avatar_url, slug, introduction, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Since the view now uses INVOKER, we need a policy that allows
-- authenticated users to SELECT from profiles for the view to work
-- But we only want to expose the safe fields through the view
-- The view already restricts columns, so we can add a broad SELECT policy
-- that the view will use, while the view restricts columns

-- Actually, the view with security_invoker will use the caller's RLS.
-- Our current policies only allow own profile + appointment participants.
-- For the view to work for browsing (e.g., reviewer names), we need
-- a broader policy. Let's add one that allows reading basic info.
-- Since RLS is row-level not column-level, we'll use a function approach.

-- Create a SECURITY DEFINER function to get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_slug text)
RETURNS TABLE(id uuid, full_name text, avatar_url text, slug text, introduction text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.slug, p.introduction, p.created_at
  FROM public.profiles p
  WHERE p.slug = profile_slug;
$$;

-- Function to get public profile names by IDs (for reviews, reports)
CREATE OR REPLACE FUNCTION public.get_public_profile_names(profile_ids uuid[])
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(profile_ids);
$$;
