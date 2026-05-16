/**
 * Polls for payment events and fires browser push notifications.
 *
 * Provider mode: polls payment_proofs for new proofs on their appointments.
 * Customer mode: polls payment_proofs for acknowledged payments (future: when provider marks received).
 *
 * Usage:
 *   usePaymentNotifications({ userId, role: 'provider' })
 *   usePaymentNotifications({ userId, role: 'customer' })
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NOTIFICATION_CONFIG } from '@/config/notificationConfig';

interface UsePaymentNotificationsProps {
  userId: string | undefined;
  role: 'provider' | 'customer';
  enabled?: boolean;
}

interface UsePaymentNotificationsReturn {
  isPolling: boolean;
  lastChecked: Date | null;
}

interface PaymentProofRow {
  id: string;
  appointment_id: string;
  created_at: string;
  appointments: {
    service: string;
    date: string;
    start_time: string;
    provider_id: string;
  };
}

export function usePaymentNotifications({
  userId,
  role,
  enabled = true,
}: UsePaymentNotificationsProps): UsePaymentNotificationsReturn {
  const [isPolling, setIsPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const seenIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const intervalRef = useRef<number | null>(null);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const showProofNotification = (proof: PaymentProofRow) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const formattedDate = formatDate(proof.appointments.date);
    const config = NOTIFICATION_CONFIG.paymentNotifications.proofSubmitted;
    const notification = new Notification(config.title, {
      body: config.body('A customer', formattedDate, proof.appointments.service),
      icon: '/favicon.ico',
      tag: `payment-proof-${proof.id}`,
    });

    setTimeout(() => notification.close(), NOTIFICATION_CONFIG.notification.autoCloseMs);
  };

  const pollProvider = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('payment_proofs')
      .select('id, appointment_id, created_at, appointments!inner(service, date, start_time, provider_id)')
      .eq('appointments.provider_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[payment-notifications] poll error:', error);
      return;
    }

    const proofs = (data ?? []) as unknown as PaymentProofRow[];

    if (isInitialLoad.current) {
      proofs.forEach(p => seenIds.current.add(p.id));
      isInitialLoad.current = false;
    } else {
      proofs.forEach(p => {
        if (!seenIds.current.has(p.id)) {
          showProofNotification(p);
          seenIds.current.add(p.id);
        }
      });
    }
  };

  const pollCustomer = async () => {
    // TODO: fire when provider marks payment received — requires payment_proofs.acknowledged_at column
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  };

  const poll = async () => {
    if (!userId || !enabled || !NOTIFICATION_CONFIG.enabled) return;

    setIsPolling(true);
    try {
      if (role === 'provider') {
        await pollProvider();
      } else {
        await pollCustomer();
      }
      setLastChecked(new Date());
    } catch (err) {
      console.error('[payment-notifications] unexpected error:', err);
    } finally {
      setIsPolling(false);
    }
  };

  useEffect(() => {
    if (!userId || !enabled || !NOTIFICATION_CONFIG.enabled) return;

    poll();

    intervalRef.current = window.setInterval(() => {
      poll();
    }, NOTIFICATION_CONFIG.pollIntervalMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role, enabled]);

  return { isPolling, lastChecked };
}
