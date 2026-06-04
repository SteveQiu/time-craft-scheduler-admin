-- Respect email_public privacy toggle in custom inquiry dialog
DROP FUNCTION IF EXISTS public.get_premium_inquiry_providers();
CREATE OR REPLACE FUNCTION public.get_premium_inquiry_providers()
RETURNS TABLE(
  id uuid,
  full_name text,
  slug text,
  avatar_url text,
  email text,
  phone text,
  social_links jsonb,
  profile_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.full_name,
    p.slug,
    p.avatar_url,
    CASE WHEN p.email_public THEN p.email ELSE NULL END,
    CASE WHEN p.phone_public THEN p.phone ELSE NULL END,
    COALESCE(p.social_links, '{}'::jsonb),
    p.profile_url
  FROM public.profiles p
  JOIN public.subscriptions s ON s.user_id = p.id
    AND s.plan_type IN ('premium', 'pro')
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  WHERE p.custom_inquiry_open = true;
$$;
