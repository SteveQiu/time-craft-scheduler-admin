import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment } from '@/components/appointments/types';
import { usePremiumReminder } from '@/hooks/usePremiumReminder';

export function useAppointmentActions({
  user,
  appointments,
  queryClient,
}: {
  user: any;
  appointments: Appointment[];
  queryClient: QueryClient;
}) {
  const { sendPremiumReminder } = usePremiumReminder();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkModifyQueue, setBulkModifyQueue] = useState<Appointment[]>([]);
  const [bulkModifyIndex, setBulkModifyIndex] = useState(0);
  const [showBulkModifyDialog, setShowBulkModifyDialog] = useState(false);
  const [bulkModifyAvailableOpenings, setBulkModifyAvailableOpenings] = useState<any[]>([]);
  const [bulkModifyLoadingOpenings, setBulkModifyLoadingOpenings] = useState(false);
  const [bulkModifyModifying, setBulkModifyModifying] = useState<string | null>(null);

  const invalidateAppointmentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] }),
    ]);
  };

  const updateAppointmentsCache = (updater: (current: Appointment[]) => Appointment[]) => {
    queryClient.setQueriesData<Appointment[]>({ queryKey: ['appointments'] }, current => {
      if (!current) return current;
      return updater(current);
    });
  };

  const handleMutationSuccess = async ({
    updater,
    message,
    invalidate = invalidateAppointmentQueries,
    afterToast,
  }: {
    updater?: (current: Appointment[]) => Appointment[];
    message: string;
    invalidate?: () => Promise<unknown>;
    afterToast?: () => Promise<void> | void;
  }) => {
    if (updater) {
      updateAppointmentsCache(updater);
    }
    toast.success(message);
    if (afterToast) {
      await afterToast();
    }
    await invalidate();
  };

  const handleApprove = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('approve_appointment', {
        _appointment_id: appointmentId,
        _provider_id: user.id,
      });
      if (error) throw error;

      const apt = appointments.find(a => a.id === appointmentId);

      await handleMutationSuccess({
        updater: apt
          ? current =>
              current.map(item => {
                if (item.id === appointmentId) {
                  return { ...item, status: 'confirmed', approved_by: user.id };
                }
                if (item.opening_id === apt.opening_id && item.status === 'pending') {
                  return { ...item, status: 'cancelled' };
                }
                return item;
              })
          : undefined,
        message: 'Appointment approved! Other pending requests were automatically declined.',
        afterToast: async () => {
          try {
            await sendPremiumReminder({
              providerUserId: user.id,
              recipientUserId: apt?.user_id,
              to: apt?.booker_email,
              date: apt?.date,
              startTime: apt?.start_time,
              type: 'confirm',
            });
          } catch (reminderError) {
            console.error('Premium reminder failed after appointment approval:', reminderError);
          }
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleReject = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('reject_appointment', {
        _appointment_id: appointmentId,
        _provider_id: user.id,
      });
      if (error) throw error;

      const apt = appointments.find(a => a.id === appointmentId);

      await handleMutationSuccess({
        updater: current =>
          current.map(item => (item.id === appointmentId ? { ...item, status: 'cancelled', approved_by: user.id } : item)),
        message: 'Appointment rejected.',
        afterToast: async () => {
          try {
            await sendPremiumReminder({
              providerUserId: user.id,
              recipientUserId: apt?.user_id,
              to: apt?.booker_email,
              date: apt?.date,
              startTime: apt?.start_time,
              type: 'deny',
            });
          } catch (reminderError) {
            console.error('Premium reminder failed after appointment rejection:', reminderError);
          }
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('cancel_appointment', {
        _appointment_id: appointmentId,
        _caller_id: user.id,
      });
      if (error) throw error;

      await handleMutationSuccess({
        updater: current =>
          current.map(item => (item.id === appointmentId ? { ...item, status: 'cancelled' } : item)),
        message: 'Appointment cancelled.',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    }
  };

  const handleBulkApprove = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toApprove = appointments.filter(
      a => selectedIds.has(a.id) && a.status === 'pending' && a.provider_id === user.id,
    );
    let successCount = 0;
    for (const apt of toApprove) {
      try {
        const { error } = await supabase.rpc('approve_appointment', {
          _appointment_id: apt.id,
          _provider_id: user.id,
        });
        if (!error) {
          successCount++;
          await sendPremiumReminder({
            providerUserId: user.id,
            recipientUserId: apt.user_id,
            to: apt.booker_email,
            date: apt.date,
            startTime: apt.start_time,
            type: 'confirm',
          });
        }
      } catch {}
    }
    setSelectedIds(new Set());
    await handleMutationSuccess({
      message: `${successCount} appointment(s) approved.`,
    });
    setIsBulkActing(false);
  };

  const handleBulkCancel = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toCancel = appointments.filter(
      a => selectedIds.has(a.id) && (a.status === 'pending' || a.status === 'confirmed'),
    );
    let successCount = 0;
    for (const apt of toCancel) {
      try {
        const { error } = await supabase.rpc('cancel_appointment', {
          _appointment_id: apt.id,
          _caller_id: user.id,
        });
        if (!error) successCount++;
      } catch {}
    }
    setSelectedIds(new Set());
    await handleMutationSuccess({
      message: `${successCount} appointment(s) cancelled.`,
    });
    setIsBulkActing(false);
  };

  const handleBulkDeny = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toDeny = appointments.filter(
      a => selectedIds.has(a.id) && a.status === 'pending' && a.provider_id === user.id,
    );
    let successCount = 0;
    for (const apt of toDeny) {
      try {
        const { error } = await supabase.rpc('reject_appointment', {
          _appointment_id: apt.id,
          _provider_id: user.id,
        });
        if (!error) {
          successCount++;
          await sendPremiumReminder({
            providerUserId: user.id,
            recipientUserId: apt.user_id,
            to: apt.booker_email,
            date: apt.date,
            startTime: apt.start_time,
            type: 'deny',
          });
        }
      } catch {}
    }
    setSelectedIds(new Set());
    await handleMutationSuccess({
      message: `${successCount} appointment(s) denied.`,
    });
    setIsBulkActing(false);
  };

  const handleBulkComplete = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toComplete = appointments.filter(
      a =>
        selectedIds.has(a.id) &&
        a.status === 'confirmed' &&
        a.provider_id === user.id,
    );
    let successCount = 0;
    for (const apt of toComplete) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', apt.id);
        if (!error) successCount++;
      } catch {}
    }
    setSelectedIds(new Set());
    await handleMutationSuccess({
      message: `${successCount} appointment(s) completed.`,
      invalidate: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
    });
    setIsBulkActing(false);
  };

  const loadBulkModifyOpenings = async (apt: Appointment) => {
    setBulkModifyLoadingOpenings(true);
    const { data } = await supabase
      .from('openings')
      .select('*')
      .eq('is_available', true)
      .eq('user_id', apt.provider_id)
      .eq('worker', apt.worker)
      .neq('id', apt.opening_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    setBulkModifyAvailableOpenings(data || []);
    setBulkModifyLoadingOpenings(false);
  };

  const advanceBulkModifyQueue = async () => {
    const nextIndex = bulkModifyIndex + 1;
    if (nextIndex >= bulkModifyQueue.length) {
      setShowBulkModifyDialog(false);
      setBulkModifyQueue([]);
      setBulkModifyIndex(0);
      setSelectedIds(new Set());
    } else {
      setBulkModifyIndex(nextIndex);
      await loadBulkModifyOpenings(bulkModifyQueue[nextIndex]);
    }
  };

  const handleStartBulkModify = async () => {
    if (!user) return;
    const toModify = appointments.filter(
      a =>
        selectedIds.has(a.id) &&
        (a.status === 'pending' || a.status === 'confirmed') &&
        (a.provider_id === user.id || a.user_id === user.id),
    );
    if (toModify.length === 0) return;
    setBulkModifyQueue(toModify);
    setBulkModifyIndex(0);
    setShowBulkModifyDialog(true);
    await loadBulkModifyOpenings(toModify[0]);
  };

  const handleBulkModifyOne = async (newOpeningId: string) => {
    const apt = bulkModifyQueue[bulkModifyIndex];
    if (!apt || !user) return;
    setBulkModifyModifying(newOpeningId);
    try {
      const { error } = await supabase.rpc('modify_appointment', {
        _appointment_id: apt.id,
        _new_opening_id: newOpeningId,
        _caller_id: user.id,
      });
      if (error) throw error;
      await handleMutationSuccess({
        message: `Appointment modified (${bulkModifyIndex + 1}/${bulkModifyQueue.length})`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to modify');
    } finally {
      setBulkModifyModifying(null);
      advanceBulkModifyQueue();
    }
  };

  return {
    selectedIds,
    setSelectedIds,
    isBulkActing,
    bulkModifyQueue,
    setBulkModifyQueue,
    bulkModifyIndex,
    setBulkModifyIndex,
    showBulkModifyDialog,
    setShowBulkModifyDialog,
    bulkModifyAvailableOpenings,
    bulkModifyLoadingOpenings,
    bulkModifyModifying,
    handleApprove,
    handleReject,
    handleCancel,
    handleBulkApprove,
    handleBulkDeny,
    handleBulkCancel,
    handleBulkComplete,
    advanceBulkModifyQueue,
    handleStartBulkModify,
    handleBulkModifyOne,
  };
}
