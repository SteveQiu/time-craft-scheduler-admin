import { supabase } from '@/integrations/supabase/client';
import { useSendReminder } from '@/hooks/useSendReminder';

interface PremiumReminderParams {
  providerUserId?: string | null;
  recipientUserId?: string | null;
  to?: string | null;
  date?: string;
  startTime?: string;
  type?: 'confirm' | 'deny';
}

export function usePremiumReminder() {
  const { sendReminder } = useSendReminder();

  const sendPremiumReminder = async ({
    providerUserId,
    recipientUserId,
    to,
    date,
    startTime,
    type = 'confirm',
  }: PremiumReminderParams) => {
    if ((!providerUserId && !recipientUserId) || !to) return;

    const checks = [];
    if (providerUserId) {
      checks.push(
        (supabase as any).rpc('is_user_premium', { p_user_id: providerUserId })
      );
    }
    if (recipientUserId) {
      checks.push(
        (supabase as any).rpc('is_user_premium', { p_user_id: recipientUserId })
      );
    }

    const results = await Promise.all(checks);
    
    const hasError = results.some(r => r.error);
    if (hasError) return;

    const anyPremium = results.some(r => r.data === true);
    if (!anyPremium) return;

    await sendReminder({
      to,
      date,
      startTime,
      type,
    });
  };

  return { sendPremiumReminder };
}
