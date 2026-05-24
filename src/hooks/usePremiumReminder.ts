import { supabase } from '@/integrations/supabase/client';
import { useSendReminder } from '@/hooks/useSendReminder';

interface PremiumReminderParams {
  userId?: string | null;
  to?: string | null;
  date?: string;
  startTime?: string;
}

export function usePremiumReminder() {
  const { sendReminder } = useSendReminder();

  const sendPremiumReminder = async ({
    userId,
    to,
    date,
    startTime,
  }: PremiumReminderParams) => {
    if (!userId || !to) return;

    const { data: isUserPremium, error } = await (supabase as any).rpc('is_user_premium', {
      p_user_id: userId,
    });

    if (error || !isUserPremium) return;

    await sendReminder({
      to,
      date,
      startTime,
    });
  };

  return { sendPremiumReminder };
}
