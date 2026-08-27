import { useMemo } from 'react';
import { Appointment } from '@/components/appointments/types';
import { DateFilter, applyDateFilter } from '@/components/appointments/calendarExport';
import { formatLocalDate } from '@/lib/date';

export function useAppointmentFiltering({
  appointments,
  searchTerm,
  statusFilter,
  dateFilter,
}: {
  appointments: Appointment[];
  searchTerm: string;
  statusFilter: string;
  dateFilter: DateFilter;
}) {
  const today = useMemo(() => formatLocalDate(new Date()), []);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(apt => {
        const matchesSearch =
          apt.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (apt.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (apt.booker_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [appointments, searchTerm, statusFilter],
  );

  const activeAppointments = useMemo(
    () =>
      filteredAppointments
        .filter(apt => (apt.status === 'confirmed' || apt.status === 'pending') && apt.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [filteredAppointments, today],
  );

  const inactiveAppointments = useMemo(
    () =>
      filteredAppointments
        .filter(apt => apt.status === 'completed' || apt.status === 'cancelled' || apt.date < today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filteredAppointments, today],
  );

  const groupedPendingByOpening = useMemo(() => {
    const pendingAppts = activeAppointments.filter(a => a.status === 'pending');
    const groups = new Map<string, Appointment[]>();
    for (const apt of pendingAppts) {
      const existing = groups.get(apt.opening_id) || [];
      existing.push(apt);
      groups.set(apt.opening_id, existing);
    }
    return groups;
  }, [activeAppointments]);

  const nonPendingActive = useMemo(
    () => activeAppointments,
    [activeAppointments],
  );

  const filteredNonPendingActive = useMemo(
    () => applyDateFilter(nonPendingActive, dateFilter),
    [nonPendingActive, dateFilter],
  );

  const filteredInactive = useMemo(
    () => applyDateFilter(inactiveAppointments, dateFilter),
    [inactiveAppointments, dateFilter],
  );

  return {
    filteredAppointments,
    activeAppointments,
    inactiveAppointments,
    groupedPendingByOpening,
    nonPendingActive,
    filteredNonPendingActive,
    filteredInactive,
  };
}
