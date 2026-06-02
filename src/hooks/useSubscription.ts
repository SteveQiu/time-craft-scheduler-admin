import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionResult {
  isPremium: boolean;
  status: string | null;
  planType: string | null;
  expiresAt: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useSubscription(): SubscriptionResult {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_status', {
        p_user_id: user!.id,
      });
      if (error) throw error;
      // RPC returns an array of rows; take first
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
    enabled: !!user,
  });

  if (!user) {
    return { isPremium: false, status: null, planType: null, expiresAt: null, loading: false, refetch: () => {} };
  }

  const planType = data?.plan_type ?? null;
  const status = data?.status ?? null;
  const isPremium = Boolean(data?.is_active);
  const expiresAt = data?.expires_at ?? null;

  return { isPremium, status, planType, expiresAt, loading: isLoading, refetch };
}
