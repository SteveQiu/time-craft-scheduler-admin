-- Add premium subscription support

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled')) DEFAULT 'inactive',
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Helper function to get user's premium status
CREATE OR REPLACE FUNCTION public.is_user_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND plan_type IN ('premium', 'pro')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get subscription details for a user
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_user_id UUID)
RETURNS TABLE (
  plan_type TEXT,
  status TEXT,
  is_active BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.plan_type,
    s.status,
    (s.plan_type IN ('premium', 'pro') AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW()))::BOOLEAN,
    s.expires_at
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
