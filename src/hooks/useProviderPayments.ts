import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethodRecord } from '@/lib/payment/types';

interface UseProviderPaymentsParams {
  providerId: string | null;
  openingId: string | null;
  selectedPaymentTabId: string | null;
}

export function useProviderPayments({ providerId, openingId, selectedPaymentTabId }: UseProviderPaymentsParams) {
  const { data: providerPayments = [], isFetching: loadingProviderPayments } = useQuery({
    queryKey: ['provider-payment-methods', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', providerId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!providerId,
  });

  // Fetch org payment methods if the provider belongs to an org
  const { data: orgPayments = [], isFetching: loadingOrgPayments } = useQuery({
    queryKey: ['org-payment-methods', providerId],
    queryFn: async () => {
      const { data: orgId } = await supabase.rpc('get_worker_org_id', {
        _user_id: providerId!,
      });
      if (!orgId) return [] as PaymentMethodRecord[];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!providerId,
  });

  // Fetch the opening's accepted payment method IDs to filter what customer sees
  const { data: paymentInfoOpening, isLoading: loadingPaymentInfoOpening } = useQuery({
    queryKey: ['opening-payment-methods', openingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('accepted_payment_method_ids')
        .eq('id', openingId!)
        .maybeSingle();
      if (error) throw error;
      return data as { accepted_payment_method_ids: string[] | null } | null;
    },
    enabled: !!openingId,
  });

  // Deduplicated + filtered methods based on opening's accepted IDs
  const allAvailableMethods = useMemo(() => {
    const all = [...(providerPayments ?? []), ...(orgPayments ?? [])];
    const seen = new Set<string>();
    const deduped = all.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const acceptedIds = paymentInfoOpening?.accepted_payment_method_ids;
    if (!acceptedIds || acceptedIds.length === 0) return deduped;
    return deduped.filter(m => acceptedIds.includes(m.id));
  }, [providerPayments, orgPayments, paymentInfoOpening]);

  // The currently active tab in the payment dialog (default to first/default method)
  const activePaymentMethod = useMemo(() => {
    if (!allAvailableMethods.length) return null;
    const activeId = selectedPaymentTabId ?? (allAvailableMethods.find(m => m.is_default) ?? allAvailableMethods[0])?.id;
    return allAvailableMethods.find(m => m.id === activeId) ?? null;
  }, [allAvailableMethods, selectedPaymentTabId]);

  return {
    providerPayments,
    orgPayments,
    paymentInfoOpening,
    allAvailableMethods,
    activePaymentMethod,
    loadingProviderPayments,
    loadingOrgPayments,
    loadingPaymentInfoOpening,
  };
}
