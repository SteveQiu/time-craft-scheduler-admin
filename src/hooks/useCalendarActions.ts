import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateOpeningForm, generateOpeningRecords } from '@/components/calendar/calendarUtils';
import type { Opening, NewOpeningForm, EditOpeningForm } from '@/components/calendar/types';
import type { OrgWorker } from '@/hooks/useOrgWorkers';
import type { User } from '@supabase/supabase-js';

interface UseCalendarActionsParams {
  user: User | null;
  isOrgMode: boolean;
  selectedDate: Date;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  editForm: EditOpeningForm;
  editingOpening: Opening | null;
  setEditingOpening: React.Dispatch<React.SetStateAction<Opening | null>>;
  setEditForm: React.Dispatch<React.SetStateAction<EditOpeningForm>>;
  openings: Opening[];
  setOpenings: React.Dispatch<React.SetStateAction<Opening[]>>;
  selectedOpeningIds: Set<string>;
  setSelectedOpeningIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLoading: (v: boolean) => void;
  setIsEditSaving: (v: boolean) => void;
  loadOpeningsForMonth: (date: Date) => Promise<void>;
  getWorkerRate: (name: string) => number;
  selfWorkerName: string;
  providerPaymentMethods: { id: string; label: string; type: string }[];
  workerData: OrgWorker[];
  ownProfile: { full_name: string | null; skills: string[]; hourly_rate: number } | undefined;
  getOrgWorkerSkills: (name: string) => string[];
  acceptedWorkers: OrgWorker[];
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  setShowAddOpening: (v: boolean) => void;
}

export function useCalendarActions({
  user,
  isOrgMode,
  selectedDate,
  currentDate,
  setCurrentDate,
  newOpening,
  setNewOpening,
  editForm,
  editingOpening,
  setEditingOpening,
  setEditForm,
  openings,
  setOpenings,
  selectedOpeningIds,
  setSelectedOpeningIds,
  setLoading,
  setIsEditSaving,
  loadOpeningsForMonth,
  getWorkerRate,
  selfWorkerName,
  providerPaymentMethods,
  workerData,
  ownProfile,
  getOrgWorkerSkills,
  acceptedWorkers,
  setErrors,
  setShowAddOpening,
}: UseCalendarActionsParams) {
  const [blockedOpenings, setBlockedOpenings] = useState<Opening[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [safeIdsToDelete, setSafeIdsToDelete] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getWorkerUserId = (name: string): string | null => {
    if (!isOrgMode) return user?.id || null;
    const worker = acceptedWorkers.find(w => w.worker_name === name);
    return worker?.user_id || null;
  };

  const openEditDialog = (opening: Opening) => {
    setEditingOpening(opening);
    const rate = Number(opening.hourly_rate) || 0;
    const dur = Number(opening.duration) || 0;
    const persistedTotal = Number(opening.total ?? 0);
    const effectiveTotal = persistedTotal > 0 ? persistedTotal : rate * dur;
    setEditForm({
      service: opening.service,
      startTime: opening.start_time.slice(0, 5),
      endTime: opening.end_time.slice(0, 5),
      isFree: effectiveTotal === 0,
      hourlyRate: rate,
      total: effectiveTotal,
      acceptedPaymentMethodIds: opening.accepted_payment_method_ids ?? [],
    });
  };

  const resetForm = () => {
    const defaultWorker = isOrgMode
      ? (workerData[0]?.worker_name || '')
      : (ownProfile?.full_name || user?.email || '');
    const defaultSkills = isOrgMode ? getOrgWorkerSkills(defaultWorker) : (ownProfile?.skills || []);
    setNewOpening({
      startTime: '09:00',
      endTime: '',
      duration: 1,
      worker: defaultWorker,
      service: defaultSkills[0] || '',
      locationFields: { city: '', province: '', country: '', zip: '' },
      multipleSlots: false,
      interval: 1,
      isFree: false,
      rateMode: 'default',
      customTotal: 0,
      multipleDates: false,
      dateRangeStart: '',
      dateRangeEnd: '',
      weekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
      acceptedPaymentMethodIds: providerPaymentMethods.map(pm => pm.id),
    });
  };

  const validateForm = () => {
    const newErrors = validateOpeningForm(newOpening, isOrgMode, selectedDate);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addOpening = async () => {
    if (!user) { toast.error('Please sign in to add openings'); return; }
    if (!validateForm()) { toast.error('Please fix validation errors'); return; }
    setLoading(true);
    const workerName = isOrgMode ? newOpening.worker : selfWorkerName;
    const workerUserId = isOrgMode ? user.id : getWorkerUserId(workerName);
    if (isOrgMode && !workerUserId) {
      toast.error('Selected worker has no user account yet');
      setLoading(false);
      return;
    }
    try {
      const slotDuration = newOpening.multipleSlots ? Number(newOpening.interval) : Number(newOpening.duration);
      const defaultRate = Number(getWorkerRate(workerName)) || 0;
      const totalValue = newOpening.rateMode === 'free' ? 0
        : newOpening.rateMode === 'custom' ? Number(newOpening.customTotal) || 0
        : defaultRate * slotDuration;
      const { records, warning } = generateOpeningRecords({
        newOpening, selectedDate, workerUserId, workerName, totalValue,
      });
      if (warning) {
        toast.warning(warning);
      } else {
        const { error } = await supabase.from('openings').insert(records);
        if (error) throw error;
        toast.success(records.length === 1 ? 'Opening added successfully' : `${records.length} openings added successfully`);
      }
      await loadOpeningsForMonth(currentDate);
      resetForm();
      setShowAddOpening(false);
    } catch (error) {
      console.error('Error adding opening:', error);
      toast.error('Failed to add opening');
    } finally {
      setLoading(false);
    }
  };

  const saveEditOpening = async () => {
    if (!editingOpening) return;
    setIsEditSaving(true);
    try {
      const dur = Number(editingOpening.duration) || 0;
      const newTotal = editForm.isFree ? 0 : Number(editForm.total) || 0;
      const newRate = editForm.isFree ? 0 : (dur > 0 ? newTotal / dur : 0);
      const { error } = await supabase
        .from('openings')
        .update({
          service: editForm.service,
          start_time: editForm.startTime,
          end_time: editForm.endTime,
          hourly_rate: newRate,
          total: newTotal,
          accepted_payment_method_ids: editForm.acceptedPaymentMethodIds.length > 0 ? editForm.acceptedPaymentMethodIds : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingOpening.id);
      if (error) throw error;
      setOpenings(prev => prev.map(o =>
        o.id === editingOpening.id
          ? { ...o, service: editForm.service, start_time: editForm.startTime, end_time: editForm.endTime, hourly_rate: newRate, total: newTotal, accepted_payment_method_ids: editForm.acceptedPaymentMethodIds.length > 0 ? editForm.acceptedPaymentMethodIds : null }
          : o
      ));
      toast.success('Opening updated');
      setEditingOpening(null);
    } catch {
      toast.error('Failed to update opening');
    } finally {
      setIsEditSaving(false);
    }
  };

  const removeOpening = async (id: string) => {
    if (!user) { toast.error('Please sign in to remove openings'); return; }
    try {
      let query = supabase.from('openings').delete().eq('id', id);
      if (!isOrgMode) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
      setOpenings(prev => prev.filter(opening => opening.id !== id));
      toast.success('Opening removed successfully');
    } catch (error) {
      console.error('Error removing opening:', error);
      toast.error('Failed to remove opening');
      await loadOpeningsForMonth(currentDate);
    }
  };

  const deleteSafeOpenings = async (ids: string[]) => {
    if (ids.length === 0) return;
    let query = supabase.from('openings').delete().in('id', ids);
    if (!isOrgMode) query = query.eq('user_id', user!.id);
    const { error } = await query;
    if (error) throw error;
    setOpenings(prev => prev.filter(o => !ids.includes(o.id)));
    setSelectedOpeningIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    toast.success(`${ids.length} opening(s) deleted`);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedOpeningIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const { data: blocked } = await supabase
        .from('appointments')
        .select('opening_id')
        .in('opening_id', Array.from(selectedOpeningIds))
        .in('status', ['pending', 'confirmed']);
      const blockedIds = new Set((blocked || []).map((a: { opening_id: string }) => a.opening_id));
      const safeIds = Array.from(selectedOpeningIds).filter(id => !blockedIds.has(id));
      const blockedOpeningsList = openings.filter(o => blockedIds.has(o.id));
      if (blockedIds.size > 0) {
        setBlockedOpenings(blockedOpeningsList);
        setSafeIdsToDelete(safeIds);
        setShowBulkDeleteConfirm(true);
        setIsBulkDeleting(false);
        return;
      }
      await deleteSafeOpenings(safeIds);
    } catch {
      toast.error('Failed to check appointments');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return {
    blockedOpenings,
    setBlockedOpenings,
    isBulkDeleting,
    safeIdsToDelete,
    setSafeIdsToDelete,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    navigateMonth,
    getWorkerUserId,
    openEditDialog,
    resetForm,
    validateForm,
    addOpening,
    saveEditOpening,
    removeOpening,
    deleteSafeOpenings,
    handleBulkDelete,
  };
}
