import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseIsPremiumParams {
  userId: string | undefined;
}

export function useIsPremium({ userId }: UseIsPremiumParams) {
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
        // No subscription found is not an error, just means not premium
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
    throwOnError: false,
    retry: false,
  });

  return { isPremium };
}
