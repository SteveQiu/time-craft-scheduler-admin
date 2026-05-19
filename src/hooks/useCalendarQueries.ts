import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UseCalendarQueriesParams {
  user: User | null;
  resetPaymentDetails: () => void;
  paymentFormLabel: string;
  paymentFormType: string;
  serializePaymentDetails: () => string | null;
  setShowPaymentDialog: (v: boolean) => void;
  setPaymentFormLabel: (v: string) => void;
  setPaymentFormType: (v: string) => void;
}

export function useCalendarQueries({
  user,
  resetPaymentDetails,
  paymentFormLabel,
  paymentFormType,
  serializePaymentDetails,
  setShowPaymentDialog,
  setPaymentFormLabel,
  setPaymentFormType,
}: UseCalendarQueriesParams) {
  const queryClient = useQueryClient();

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['workplace-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplace_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: providerPaymentMethods = [] } = useQuery({
    queryKey: ['provider-payment-methods-for-opening', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, label, type')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; label: string; type: string }[];
    },
    enabled: !!user,
  });

  const savePaymentFromOpening = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const details = serializePaymentDetails();
      const { error } = await supabase
        .from('payment_methods')
        .insert([{ user_id: user.id, label: paymentFormLabel, type: paymentFormType, details: details ?? undefined }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-payment-methods-for-opening', user?.id] });
      setShowPaymentDialog(false);
      setPaymentFormLabel('');
      setPaymentFormType('cash');
      resetPaymentDetails();
      toast.success('Payment acceptance method added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { savedAddresses, providerPaymentMethods, savePaymentFromOpening };
}
