import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSendReminder() {
  const sendReminder = async (params: {
    to: string;
    date?: string;
    startTime?: string;
    type?: 'confirm' | 'deny';
  }) => {
    try {
      await supabase.functions.invoke('reminder-smtp', {
        body: {
          to: params.to,
          appointmentTime: params.date && params.startTime
            ? `${new Date(params.date).toLocaleDateString()} at ${params.startTime}`
            : undefined,
          type: params.type,
        }
      });
    } catch (emailError) {
      console.warn('Email notification failed:', emailError);
      const label = params.type === 'deny' ? 'Denied' : 'Confirmed';
      toast.warning(`Appointment ${label.toLowerCase()}! Email notification could not be sent.`);
    }
  };

  return { sendReminder };
}
