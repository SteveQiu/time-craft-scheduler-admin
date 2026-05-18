import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePaymentStatus(appointmentIds: string[]) {
  // Query 1: paid status (row presence only — select appointment_id, photo_url)
  const { data: submittedProofs } = useQuery({
    queryKey: ['payment-proofs-bulk', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('appointment_id, photo_url')
        .in('appointment_id', appointmentIds);
      if (error) console.error('[payment-proofs] query error:', error);
      return data ?? [];
    },
  });

  const paidAppointmentIds = useMemo(
    () => new Map((submittedProofs ?? []).map((p: { appointment_id: string; photo_url: string | null }) => [p.appointment_id, p.photo_url ?? null])),
    [submittedProofs]
  );

  // Query 2: payment method — failure is cosmetic, never affects paid/unpaid
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods-bulk', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('appointment_id, payment_method_type')
        .in('appointment_id', appointmentIds);
      if (error) console.error('[payment-methods] query error:', error);
      return data ?? [];
    },
  });

  const cashAppointmentIds = useMemo(
    () => new Set(
      (paymentMethods ?? [])
        .filter((p: { appointment_id: string; payment_method_type: string | null }) => p.payment_method_type === 'cash')
        .map((p: { appointment_id: string; payment_method_type: string | null }) => p.appointment_id)
    ),
    [paymentMethods]
  );

  const cardAppointmentIds = useMemo(
    () => new Set(
      (paymentMethods ?? [])
        .filter((p: { appointment_id: string; payment_method_type: string | null }) => p.payment_method_type === 'onsite_credit_card' || p.payment_method_type === 'onsite_debit_card')
        .map((p: { appointment_id: string; payment_method_type: string | null }) => p.appointment_id)
    ),
    [paymentMethods]
  );

  return { paidAppointmentIds, cashAppointmentIds, cardAppointmentIds, submittedProofs, paymentMethods };
}
