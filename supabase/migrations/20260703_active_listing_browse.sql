-- Active Listing browse advertisement RPC for anonymous and signed-in users.
-- Active Listing = premium/pro provider who turned ON the "Active Listing & Custom
-- Time" toggle (profiles.custom_inquiry_open). Such providers are advertised in the
-- browse page filtered by their profile province/country (Settings > Location), even
-- with zero available openings. Returns contact info so bookers can reach out
-- (email/phone gated by public flags, social links, profile url).
DROP FUNCTION IF EXISTS public.get_active_listing_providers(text, text);
CREATE OR REPLACE FUNCTION public.get_active_listing_providers(p_province text DEFAULT NULL, p_country text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  full_name text,
  slug text,
  avatar_url text,
  province text,
  country text,
  email text,
  phone text,
  social_links jsonb,
  profile_url text,
  skills text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.full_name,
    p.slug,
    p.avatar_url,
    p.province,
    p.country,
    CASE WHEN p.email_public THEN p.email ELSE NULL END,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    COALESCE(p.social_links, '{}'::jsonb),
    p.profile_url,
    CASE WHEN p.skills_public THEN COALESCE(p.skills, '{}'::text[]) ELSE '{}'::text[] END
  FROM public.profiles p
  JOIN public.subscriptions s ON s.user_id = p.id
    AND s.plan_type IN ('premium', 'pro')
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  WHERE p.custom_inquiry_open = true
    AND (p_province IS NULL OR p.province ILIKE p_province)
    AND (p_country IS NULL OR p.country ILIKE p_country);
$$;

GRANT EXECUTE ON FUNCTION public.get_active_listing_providers(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_listing_providers(text, text) TO anon;
