import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/components/appointments/types';
import { isOnsitePayment } from '@/hooks/usePaymentMethods';

interface AppointmentPaymentMethodType {
  appointment_id: string;
  type: string;
}

export function useAppointmentPaymentRequirements(appointments: Appointment[]) {
  const appointmentIds = useMemo(
    () => appointments.map((a) => a.id).filter(Boolean),
    [appointments]
  );

  const { data: paymentMethodTypes = [] } = useQuery({
    queryKey: ['appointment-accepted-payment-method-types', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_appointment_accepted_payment_method_types', {
        p_appointment_ids: appointmentIds,
      });

      if (error) {
        console.error('[useAppointmentPaymentRequirements] query error:', error);
        throw error;
      }

      return (data ?? []) as AppointmentPaymentMethodType[];
    },
  });

  const onsiteOnlyPaymentAppointmentIds = useMemo(() => {
    const typesByAppointment = paymentMethodTypes.reduce((map, row) => {
      const types = map.get(row.appointment_id) ?? [];
      types.push(row.type);
      map.set(row.appointment_id, types);
      return map;
    }, new Map<string, string[]>());

    return new Set(
      appointments
        .filter((appointment) => {
          const types = typesByAppointment.get(appointment.id) ?? [];
          if (types.length === 0) return false;
          return types.every((type) => isOnsitePayment(type));
        })
        .map((appointment) => appointment.id)
    );
  }, [appointments, paymentMethodTypes]);

  return { onsiteOnlyPaymentAppointmentIds };
}

