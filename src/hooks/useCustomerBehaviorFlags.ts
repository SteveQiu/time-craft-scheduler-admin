import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseCustomerBehaviorFlagsParams {
  userId: string | undefined;
}

interface CustomerBehaviorFlag {
  reason: string;
  notes: string | null;
}

export function useCustomerBehaviorFlags({ userId }: UseCustomerBehaviorFlagsParams) {
  const queryClient = useQueryClient();
  const queryKey = ['customerBehaviorFlags', userId] as const;

  const { data: flaggedCustomerIds = new Map<string, CustomerBehaviorFlag>() } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return new Map<string, CustomerBehaviorFlag>();

      const { data, error } = await (supabase as any)
        .from('customer_behavior_flags')
        .select('user_id, reason, notes')
        .eq('flagged_by', userId);

      if (error) {
        console.warn('[useCustomerBehaviorFlags] query failed (table may not exist yet):', error.message);
        return new Map<string, CustomerBehaviorFlag>();
      }

      return new Map<string, CustomerBehaviorFlag>(
        (data ?? []).map((row: any) => [
          row.user_id,
          {
            reason: row.reason ?? 'other',
            notes: row.notes ?? null,
          },
        ])
      );
    },
    enabled: !!userId,
    throwOnError: false,
    retry: false,
  });

  const flagMutation = useMutation({
    mutationFn: async ({
      customerId,
      reason,
      notes,
      appointmentId,
    }: {
      customerId: string;
      reason: string;
      notes?: string;
      appointmentId?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await (supabase as any)
        .from('customer_behavior_flags')
        .upsert(
          {
            flagged_by: userId,
            user_id: customerId,
            reason,
            notes: notes?.trim() ? notes.trim() : null,
            appointment_id: appointmentId ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'flagged_by,user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const unflagMutation = useMutation({
    mutationFn: async (customerId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await (supabase as any)
        .from('customer_behavior_flags')
        .delete()
        .eq('flagged_by', userId)
        .eq('user_id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    flaggedCustomerIds,
    flagCustomer: (targetUserId: string, reason: string, notes?: string, appointmentId?: string) =>
      flagMutation.mutateAsync({
        customerId: targetUserId,
        reason,
        notes,
        appointmentId,
      }),
    unflagCustomer: unflagMutation.mutateAsync,
  };
}
