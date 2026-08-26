import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AUTOMATIC_OPENINGS_MAINTAINED_EVENT } from '@/lib/automaticSchedule';

export function AutomaticScheduleWatcher() {
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();
  const queryClient = useQueryClient();
  const maintainedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      maintainedUserRef.current = null;
      return;
    }
    if (loading || !isPremium || maintainedUserRef.current === user.id) return;

    maintainedUserRef.current = user.id;
    void supabase.rpc('maintain_automatic_openings').then(({ data, error }) => {
      if (error) {
        maintainedUserRef.current = null;
        if (error.code === 'PGRST202') {
          console.warn('Automatic scheduling is waiting for its database migration.');
          return;
        }
        console.error('Failed to maintain automatic openings:', error);
        toast.error('Automatic scheduling could not be updated');
        return;
      }

      if ((data ?? 0) > 0) {
        window.dispatchEvent(new Event(AUTOMATIC_OPENINGS_MAINTAINED_EVENT));
        void queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
      }
    });
  }, [isPremium, loading, queryClient, user?.id]);

  return null;
}
