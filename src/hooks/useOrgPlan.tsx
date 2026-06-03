import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrgPlan {
  plan: 'free' | 'premium';
  loading: boolean;
}

export function useOrgPlan(orgId: string | null): OrgPlan {
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('plan_type, status, expires_at')
        .eq('user_id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch subscription plan:', error);
      } else if (data) {
        const isPremium =
          ['premium', 'pro'].includes(data.plan_type) &&
          data.status === 'active' &&
          (!data.expires_at || new Date(data.expires_at) > new Date());
        setPlan(isPremium ? 'premium' : 'free');
      }

      setLoading(false);

      // Subscribe to real-time updates (both INSERT and UPDATE)
      channel = supabase
        .channel(`subscription-plan-${orgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${orgId}`,
          },
          (payload) => {
            const row = payload.new as any;
            if (row) {
              const isPremium =
                ['premium', 'pro'].includes(row.plan_type) &&
                row.status === 'active' &&
                (!row.expires_at || new Date(row.expires_at) > new Date());
              setPlan(isPremium ? 'premium' : 'free');
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orgId]);

  return { plan, loading };
}
