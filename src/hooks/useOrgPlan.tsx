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
      // Fetch current plan
      const { data, error } = await supabase
        .from('orgs')
        .select('plan')
        .eq('id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch org plan:', error);
      } else if (data) {
        setPlan(data.plan as 'free' | 'premium');
      } else {
        // Org record doesn't exist yet, create it
        const { error: insertError } = await supabase
          .from('orgs')
          .insert({ id: orgId, plan: 'free' })
          .select()
          .maybeSingle();

        if (insertError) {
          console.error('Failed to create org record:', insertError);
        }
      }

      setLoading(false);

      // Subscribe to real-time updates
      channel = supabase
        .channel(`org-plan-${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orgs',
            filter: `id=eq.${orgId}`,
          },
          (payload) => {
            if (payload.new?.plan) {
              setPlan(payload.new.plan as 'free' | 'premium');
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
