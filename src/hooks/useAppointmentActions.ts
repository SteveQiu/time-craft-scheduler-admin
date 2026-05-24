import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment } from '@/components/appointments/types';
import { useSendReminder } from '@/hooks/useSendReminder';

export function useAppointmentActions({
  user,
  isOrgView,
  appointments,
  queryClient,
}: {
  user: any;
  isOrgView: boolean;
  appointments: Appointment[];
  queryClient: QueryClient;
}) {
  const { sendReminder } = useSendReminder();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkModifyQueue, setBulkModifyQueue] = useState<Appointment[]>([]);
  const [bulkModifyIndex, setBulkModifyIndex] = useState(0);
  const [showBulkModifyDialog, setShowBulkModifyDialog] = useState(false);
  const [bulkModifyAvailableOpenings, setBulkModifyAvailableOpenings] = useState<any[]>([]);
  const [bulkModifyLoadingOpenings, setBulkModifyLoadingOpenings] = useState(false);
  const [bulkModifyModifying, setBulkModifyModifying] = useState<string | null>(null);

  const handleApprove = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('approve_appointment', {
        _appointment_id: appointmentId,
        _provider_id: user.id,
      });
      if (error) throw error;
      toast.success('Appointment approved! Other pending requests were automatically declined.');
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt?.provider_id && apt.booker_email) {
        const { data: isProviderPremium } = await (supabase as any).rpc('is_user_premium', { p_user_id: apt.provider_id });
        if (isProviderPremium) {
          await sendReminder({ to: apt.booker_email, date: apt.date, startTime: apt.start_time });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
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
      toast.success('Appointment cancelled.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    }
  };

  const handleComplete = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);
    if (error) {
      toast.error('Failed to complete');
    } else {
      toast.success('Appointment completed.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
          if (apt.provider_id && apt.booker_email) {
            const { data: isProviderPremium } = await (supabase as any).rpc('is_user_premium', { p_user_id: apt.provider_id });
            if (isProviderPremium) {
              await sendReminder({ to: apt.booker_email, date: apt.date, startTime: apt.start_time });
            }
          }
        }
      } catch {}
    }
    toast.success(`${successCount} appointment(s) approved.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
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
    toast.success(`${successCount} appointment(s) cancelled.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
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
        if (!error) successCount++;
      } catch {}
    }
    toast.success(`${successCount} appointment(s) denied.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    setIsBulkActing(false);
  };

  const handleBulkComplete = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toComplete = appointments.filter(
      a =>
        selectedIds.has(a.id) &&
        a.status === 'confirmed' &&
        (isOrgView || a.provider_id === user.id),
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
    toast.success(`${successCount} appointment(s) completed.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
        (isOrgView || a.provider_id === user.id || a.user_id === user.id),
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
      toast.success(`Appointment modified (${bulkModifyIndex + 1}/${bulkModifyQueue.length})`);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
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
    handleCancel,
    handleComplete,
    handleBulkApprove,
    handleBulkDeny,
    handleBulkCancel,
    handleBulkComplete,
    advanceBulkModifyQueue,
    handleStartBulkModify,
    handleBulkModifyOne,
  };
}
