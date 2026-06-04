import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * App-level singleton that listens to realtime changes on
 * `subscriptions` and `user_roles` tables for the current user,
 * then invalidates the relevant react-query caches.
 *
 * Mount once near the app root — prevents duplicate channels
 * that would otherwise be created per hook consumer.
 */
export function RealtimeInvalidator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`app-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
          queryClient.invalidateQueries({ queryKey: ['isPremium', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['userRoles', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return null;
}
