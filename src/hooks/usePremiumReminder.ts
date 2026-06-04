import { supabase } from '@/integrations/supabase/client';
import { useSendReminder } from '@/hooks/useSendReminder';

interface PremiumReminderParams {
  recipientUserId?: string | null;
  to?: string | null;
  date?: string;
  startTime?: string;
  type?: 'confirm' | 'deny';
}

export function usePremiumReminder() {
  const { sendReminder } = useSendReminder();

  const sendPremiumReminder = async ({
    recipientUserId,
    to,
    date,
    startTime,
    type = 'confirm',
  }: PremiumReminderParams) => {
    if (!recipientUserId || !to) return;

    const { data: isRecipientPremium, error } = await (supabase as any).rpc('is_user_premium', {
      p_user_id: recipientUserId,
    });

    if (error || !isRecipientPremium) return;

    await sendReminder({
      to,
      date,
      startTime,
      type,
    });
  };

  return { sendPremiumReminder };
}
