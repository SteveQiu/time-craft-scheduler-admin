import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/components/appointments/types';
import { isOnsitePayment } from '@/hooks/usePaymentMethods';

interface PaymentMethodSummary {
  id: string;
  type: string;
  user_id: string;
}

export function useAppointmentPaymentRequirements(appointments: Appointment[]) {
  const providerIds = useMemo(
    () => Array.from(new Set(appointments.map((appointment) => appointment.provider_id).filter(Boolean))),
    [appointments]
  );

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['appointment-provider-payment-methods', providerIds],
    enabled: providerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_appointment_provider_payment_methods', {
        provider_ids: providerIds,
      });

      if (error) {
        console.error('[useAppointmentPaymentRequirements] query error:', error);
        throw error;
      }

      return (data ?? []) as PaymentMethodSummary[];
    },
  });

  const onsiteOnlyPaymentAppointmentIds = useMemo(() => {
    const paymentMethodsByProvider = paymentMethods.reduce((map, paymentMethod) => {
      const providerPaymentMethods = map.get(paymentMethod.user_id) ?? [];
      providerPaymentMethods.push(paymentMethod.type);
      map.set(paymentMethod.user_id, providerPaymentMethods);
      return map;
    }, new Map<string, string[]>());

    return new Set(
      appointments
        .filter((appointment) => {
          const providerPaymentMethodTypes = paymentMethodsByProvider.get(appointment.provider_id) ?? [];

          if (providerPaymentMethodTypes.length === 0) return false;

          return providerPaymentMethodTypes.every((paymentMethodType) => isOnsitePayment(paymentMethodType));
        })
        .map((appointment) => appointment.id)
    );
  }, [appointments, paymentMethods]);

  return { onsiteOnlyPaymentAppointmentIds };
}
