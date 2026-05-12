import type { NewOpeningForm } from './types';
import { serializeLocation } from '@/lib/address';

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const calculateEndTime = (startTime: string, duration: number): string => {
  const startMinutes = parseTime(startTime);
  const endMinutes = startMinutes + duration * 60;
  return formatTime(endMinutes);
};

export const getDaysInMonth = (date: Date): (Date | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
};

export const isToday = (date: Date | null): boolean => {
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSameDate = (date1: Date | null, date2: Date): boolean => {
  if (!date1) return false;
  return date1.toDateString() === date2.toDateString();
};

export const getDateBounds = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 2);
  return { minDate: today, maxDate };
};

export const isDisabledDate = (date: Date | null): boolean => {
  if (!date) return false;
  const { minDate, maxDate } = getDateBounds();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < minDate || d > maxDate;
};

export const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    options.push(`${hour.toString().padStart(2, '0')}:00`);
    options.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return options;
};

export const generateEndTimeOptions = (startTime: string): string[] => {
  if (!startTime) return generateTimeOptions();
  const allTimes = generateTimeOptions();
  const startMinutes = parseTime(startTime);
  return allTimes.filter(time => parseTime(time) > startMinutes);
};

export const generateDurationOptions = (): { value: number; label: string }[] => {
  const options = [];
  for (let i = 1; i <= 24; i++) {
    options.push({ value: i, label: `${i} hour${i > 1 ? 's' : ''}` });
  }
  return options;
};

export const validateOpeningForm = (
  newOpening: NewOpeningForm,
  isOrgMode: boolean,
  selectedDate: Date,
): { [key: string]: string } => {
  const newErrors: { [key: string]: string } = {};

  if (!newOpening.startTime) {
    newErrors.startTime = 'Start time is required';
  }

  if (isOrgMode && !newOpening.worker) {
    newErrors.worker = 'Worker selection is required';
  }

  if (!newOpening.service) {
    newErrors.service = 'Service selection is required';
  }

  if (!newOpening.locationFields.city || !newOpening.locationFields.city.trim()) {
    newErrors.location = 'City is required';
  }

  if (newOpening.duration <= 0) {
    newErrors.duration = 'Duration must be greater than 0';
  }

  if (newOpening.multipleSlots && newOpening.interval <= 0) {
    newErrors.interval = 'Interval must be greater than 0';
  }

  if (newOpening.multipleSlots && !newOpening.endTime) {
    newErrors.endTime = 'End time is required for multiple slots';
  }

  if (newOpening.multipleDates && !newOpening.dateRangeStart) {
    newErrors.dateRangeStart = 'Start date is required';
  }

  if (newOpening.multipleDates && !newOpening.dateRangeEnd) {
    newErrors.dateRangeEnd = 'End date is required';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (newOpening.multipleDates && newOpening.dateRangeStart) {
    const startDate = new Date(newOpening.dateRangeStart);
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      newErrors.dateRangeStart = 'Start date cannot be earlier than today';
    }
  }

  if (newOpening.multipleDates && newOpening.dateRangeStart && newOpening.dateRangeEnd) {
    const startDate = new Date(newOpening.dateRangeStart);
    const endDate = new Date(newOpening.dateRangeEnd);
    if (startDate > endDate) {
      newErrors.dateRangeEnd = 'End date must be after start date';
    }
  }

  if (!newOpening.multipleDates) {
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    if (selectedDateOnly < today) {
      newErrors.date = 'Cannot add openings to past dates';
    }
  }

  if (newOpening.multipleDates && newOpening.weekdays.size === 0) {
    newErrors.weekdays = 'At least one day must be selected';
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (newOpening.startTime && !timeRegex.test(newOpening.startTime)) {
    newErrors.startTime = 'Invalid time format';
  }

  if (newOpening.multipleSlots && newOpening.endTime && !timeRegex.test(newOpening.endTime)) {
    newErrors.endTime = 'Invalid time format';
  }

  return newErrors;
};

export interface OpeningInsertData {
  user_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  worker: string;
  service: string;
  location: string;
  is_available: boolean;
  hourly_rate: number;
  total: number;
  accepted_payment_method_ids: string[] | null;
}

export function generateOpeningRecords({
  newOpening,
  selectedDate,
  workerUserId,
  workerName,
  totalValue,
}: {
  newOpening: NewOpeningForm;
  selectedDate: Date;
  workerUserId: string | null;
  workerName: string;
  totalValue: number;
}): { records: OpeningInsertData[]; warning?: string } {
  const acceptedIds = newOpening.acceptedPaymentMethodIds.length > 0
    ? newOpening.acceptedPaymentMethodIds : null;
  const slotDuration = newOpening.multipleSlots ? newOpening.interval : newOpening.duration;
  const derivedRate = slotDuration > 0 ? totalValue / slotDuration : 0;
  const base = {
    user_id: workerUserId,
    worker: workerName,
    service: newOpening.service,
    location: serializeLocation(newOpening.locationFields),
    is_available: true,
    hourly_rate: derivedRate,
    total: totalValue,
    accepted_payment_method_ids: acceptedIds,
  };

  if (newOpening.multipleDates && newOpening.dateRangeStart && newOpening.dateRangeEnd) {
    const records: OpeningInsertData[] = [];
    const [sy, sm, sd] = newOpening.dateRangeStart.split('-').map(Number);
    const [ey, em, ed] = newOpening.dateRangeEnd.split('-').map(Number);
    const current = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);
    while (current <= endDate) {
      if (newOpening.weekdays.has(current.getDay())) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        if (newOpening.multipleSlots && newOpening.endTime) {
          const end = parseTime(newOpening.endTime);
          let slot = parseTime(newOpening.startTime);
          while (slot < end) {
            const startTimeStr = formatTime(slot);
            records.push({ ...base, date: dateStr, start_time: startTimeStr, end_time: calculateEndTime(startTimeStr, newOpening.interval), duration: newOpening.interval });
            slot += newOpening.interval * 60;
          }
        } else {
          records.push({ ...base, date: dateStr, start_time: newOpening.startTime, end_time: calculateEndTime(newOpening.startTime, newOpening.duration), duration: newOpening.duration });
        }
      }
      current.setDate(current.getDate() + 1);
    }
    if (records.length === 0) return { records: [], warning: 'No dates found matching the selected criteria' };
    return { records };
  }

  const dateStr = selectedDate.toISOString().split('T')[0];
  if (newOpening.multipleSlots && newOpening.endTime) {
    const records: OpeningInsertData[] = [];
    const end = parseTime(newOpening.endTime);
    let current = parseTime(newOpening.startTime);
    while (current < end) {
      const startTimeStr = formatTime(current);
      records.push({ ...base, date: dateStr, start_time: startTimeStr, end_time: calculateEndTime(startTimeStr, newOpening.interval), duration: newOpening.interval });
      current += newOpening.interval * 60;
    }
    return { records };
  }

  return {
    records: [{
      ...base,
      date: dateStr,
      start_time: newOpening.startTime,
      end_time: calculateEndTime(newOpening.startTime, newOpening.duration),
      duration: newOpening.duration,
    }],
  };
}

