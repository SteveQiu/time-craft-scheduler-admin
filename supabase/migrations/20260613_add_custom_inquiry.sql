-- Add custom_inquiry_open to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_inquiry_open boolean DEFAULT false;

-- RPC to get premium providers open for custom inquiry
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
    p.email,
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

GRANT EXECUTE ON FUNCTION public.get_premium_inquiry_providers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_premium_inquiry_providers() TO anon;
