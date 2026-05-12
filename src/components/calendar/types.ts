import type { LocationFields } from '@/lib/address';

export interface TimeSlot {
  id: string;
  time: string;
  worker: string;
  service: string;
  client?: string;
  status: 'available' | 'booked' | 'blocked';
}

export interface Opening {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  worker: string;
  service: string;
  is_available: boolean;
  hourly_rate: number;
  total?: number;
  created_at: string;
  updated_at: string;
  accepted_payment_method_ids?: string[] | null;
}

export interface NewOpeningForm {
  startTime: string;
  endTime: string;
  duration: number;
  worker: string;
  service: string;
  locationFields: LocationFields;
  multipleSlots: boolean;
  interval: number;
  isFree: boolean;
  rateMode: 'free' | 'default' | 'custom';
  customTotal: number;
  multipleDates: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  weekdays: Set<number>;
  acceptedPaymentMethodIds: string[];
}

export interface EditOpeningForm {
  service: string;
  startTime: string;
  endTime: string;
  isFree: boolean;
  hourlyRate: number;
  total: number;
  acceptedPaymentMethodIds: string[];
}
