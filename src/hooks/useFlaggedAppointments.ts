import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseFlaggedAppointmentsParams {
  appointmentIds: string[];
  userId: string | undefined;
}

export function useFlaggedAppointments({ appointmentIds, userId }: UseFlaggedAppointmentsParams) {
  const queryClient = useQueryClient();

  const { data: flaggedAppointmentIds = new Set<string>(), refetch } = useQuery({
    queryKey: ['flaggedAppointments', userId, appointmentIds],
    queryFn: async () => {
      if (!userId || appointmentIds.length === 0) return new Set<string>();
      
      const { data, error } = await (supabase as any)
        .from('appointment_flags')
        .select('appointment_id')
        .eq('flagged_by', userId)
        .in('appointment_id', appointmentIds);
      
      if (error) {
        console.warn('[useFlaggedAppointments] query failed (table may not exist yet):', error.message);
        return new Set<string>();
      }
      return new Set<string>(data.map((row: any) => row.appointment_id));
    },
    enabled: !!userId && appointmentIds.length > 0,
    throwOnError: false,
    retry: false,
  });

  const flagMutation = useMutation({
    mutationFn: async ({ appointmentId, bookerUserId }: { appointmentId: string; bookerUserId: string }) => {
      if (!userId) throw new Error('User not authenticated');
      
      const { error } = await (supabase as any)
        .from('appointment_flags')
        .insert({
          appointment_id: appointmentId,
          flagged_by: userId,
          user_id: bookerUserId,
          reason: 'no_show',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flaggedAppointments', userId] });
    },
  });

  const unflagMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!userId) throw new Error('User not authenticated');
      
      const { error } = await (supabase as any)
        .from('appointment_flags')
        .delete()
        .eq('appointment_id', appointmentId)
        .eq('flagged_by', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flaggedAppointments', userId] });
    },
  });

  return {
    flaggedAppointmentIds,
    refetch,
    flagAppointment: flagMutation.mutateAsync,
    unflagAppointment: unflagMutation.mutateAsync,
  };
}
