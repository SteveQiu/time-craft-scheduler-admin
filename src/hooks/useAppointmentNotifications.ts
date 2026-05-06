import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NOTIFICATION_CONFIG } from '@/config/notificationConfig';

interface UseAppointmentNotificationsProps {
  userId: string | undefined;
  enabled?: boolean;
}

interface UseAppointmentNotificationsReturn {
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<void>;
  isPolling: boolean;
  lastChecked: Date | null;
}

interface AppointmentNotification {
  id: string;
  service: string;
  date: string;
  start_time: string;
  status: string;
}

export function useAppointmentNotifications({
  userId,
  enabled = true,
}: UseAppointmentNotificationsProps): UseAppointmentNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isPolling, setIsPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const seenConfirmedIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const intervalRef = useRef<number | null>(null);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const showNotification = (appointment: AppointmentNotification) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const formattedDate = formatDate(appointment.date);
    const formattedTime = formatTime(appointment.start_time);
    
    const notification = new Notification(
      NOTIFICATION_CONFIG.notification.title,
      {
        body: NOTIFICATION_CONFIG.notification.body(
          appointment.service,
          formattedDate,
          formattedTime
        ),
        icon: NOTIFICATION_CONFIG.notification.icon,
        tag: `appointment-${appointment.id}`, // Prevent duplicate notifications
      }
    );

    if (NOTIFICATION_CONFIG.notification.autoCloseMs > 0) {
      setTimeout(() => notification.close(), NOTIFICATION_CONFIG.notification.autoCloseMs);
    }
  };

  const pollAppointments = async () => {
    if (!userId || !enabled || !NOTIFICATION_CONFIG.enabled) {
      return;
    }

    setIsPolling(true);

    try {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - NOTIFICATION_CONFIG.lookbackDays);
      const lookbackCutoff = lookbackDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select('id, service, date, start_time, status')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('date', lookbackCutoff)
        .order('date', { ascending: true })
        .limit(NOTIFICATION_CONFIG.maxAppointmentsToCheck);

      if (error) {
        console.error('Error polling appointments:', error);
        return;
      }

      const appointments = (data || []) as AppointmentNotification[];

      if (isInitialLoad.current) {
        // Initial load: populate seen set WITHOUT firing notifications
        appointments.forEach(apt => seenConfirmedIds.current.add(apt.id));
        isInitialLoad.current = false;
      } else {
        // Subsequent polls: check for NEW confirmed appointments
        appointments.forEach(apt => {
          if (!seenConfirmedIds.current.has(apt.id)) {
            showNotification(apt);
            seenConfirmedIds.current.add(apt.id);
          }
        });
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error in appointment polling:', error);
    } finally {
      setIsPolling(false);
    }
  };

  useEffect(() => {
    // Request permission on mount
    if (enabled && NOTIFICATION_CONFIG.enabled && typeof Notification !== 'undefined') {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userId || !enabled || !NOTIFICATION_CONFIG.enabled) {
      return;
    }

    // Initial poll
    pollAppointments();

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      pollAppointments();
    }, NOTIFICATION_CONFIG.pollIntervalMs);

    // Cleanup
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, enabled, permissionStatus]);

  return {
    permissionStatus,
    requestPermission,
    isPolling,
    lastChecked,
  };
}
