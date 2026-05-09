import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAppointmentRates(appointmentIds: string[]) {
  const { data: appointmentRates = [] } = useQuery({
    queryKey: ['appointment-rates', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_appointment_rates', { _appointment_ids: appointmentIds });
      if (error) throw error;
      return (data ?? []) as { appointment_id: string; hourly_rate: number }[];
    },
  });

  const appointmentRateMap = useMemo(
    () => new Map(appointmentRates.map(r => [r.appointment_id, Number(r.hourly_rate ?? 0)])),
    [appointmentRates]
  );

  return { appointmentRates, appointmentRateMap };
}
