import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseIsPremiumParams {
  userId: string | undefined;
}

export function useIsPremium({ userId }: UseIsPremiumParams) {
  const { user } = useAuth();
  const isCurrentUser = !!userId && userId === user?.id;
  const queryClient = useQueryClient();

  // For current user, try to derive from the existing subscription cache first
  const cachedSub = isCurrentUser
    ? queryClient.getQueryData<any>(['subscription', userId])
    : undefined;

  const { data: isPremium = false } = useQuery({
    queryKey: ['isPremium', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, expires_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        console.warn('[useIsPremium] query failed:', error.message);
        return false;
      }

      if (!data) return false;

      const isPremiumPlan = ['premium', 'pro'].includes(data.plan_type);
      const isActive = data.status === 'active';
      const notExpired = !data.expires_at || new Date(data.expires_at) > new Date();

      return isPremiumPlan && isActive && notExpired;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,  // revalidated by RealtimeInvalidator for current user
    initialData: cachedSub ? Boolean(cachedSub.is_active) : undefined,
    throwOnError: false,
    retry: false,
  });

  return { isPremium };
}
