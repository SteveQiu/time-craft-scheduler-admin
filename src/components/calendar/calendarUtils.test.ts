import { addDays, addMonths, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  getDateBounds,
  isDisabledDate,
  parseDateInput,
  validateAutomaticScheduleForm,
  validateOpeningForm,
} from './calendarUtils';
import type { NewOpeningForm } from './types';

const validForm: NewOpeningForm = {
  startTime: '09:00',
  endTime: '17:00',
  duration: 1,
  worker: 'Provider',
  service: 'Consultation',
  locationFields: {
    address_line_1: '1 Main St',
    address_line_2: '',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    zip: 'A1A 1A1',
  },
  multipleSlots: true,
  interval: 1,
  isFree: false,
  rateMode: 'default',
  customTotal: 0,
  multipleDates: false,
  dateRangeStart: '',
  dateRangeEnd: '',
  weekdays: new Set([1, 3, 5]),
  acceptedPaymentMethodIds: [],
};

describe('validateAutomaticScheduleForm', () => {
  it('does not require start or end dates', () => {
    expect(validateAutomaticScheduleForm(validForm)).toEqual({});
  });

  it('requires at least one weekday', () => {
    const errors = validateAutomaticScheduleForm({
      ...validForm,
      weekdays: new Set(),
    });

    expect(errors.weekdays).toBe('At least one day must be selected');
  });

  it('requires an end time for multiple slots', () => {
    const errors = validateAutomaticScheduleForm({
      ...validForm,
      endTime: '',
    });

    expect(errors.endTime).toBe('End time is required for multiple slots');
  });

  it('rejects intervals that do not fit the selected range', () => {
    const errors = validateAutomaticScheduleForm({
      ...validForm,
      startTime: '16:30',
      endTime: '17:00',
      interval: 1,
    });

    expect(errors.interval).toBe('Interval must fit within the selected time range');
  });

  it('rejects single openings that reach the next day', () => {
    const errors = validateAutomaticScheduleForm({
      ...validForm,
      multipleSlots: false,
      startTime: '23:30',
      duration: 1,
    });

    expect(errors.duration).toBe('Opening must end before midnight');
  });
});

describe('validateOpeningForm date limits', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formForRange = (endDate: Date): NewOpeningForm => ({
    ...validForm,
    multipleDates: true,
    dateRangeStart: format(today, 'yyyy-MM-dd'),
    dateRangeEnd: format(endDate, 'yyyy-MM-dd'),
  });

  it('allows premium openings through one year from today', () => {
    const errors = validateOpeningForm(formForRange(addMonths(today, 12)), today, true);

    expect(errors.dateRangeEnd).toBeUndefined();
    expect(errors.dateRangeStart).toBeUndefined();
  });

  it('rejects premium openings beyond one year from today', () => {
    const errors = validateOpeningForm(formForRange(addDays(addMonths(today, 12), 1)), today, true);

    expect(errors.dateRangeEnd).toBe('End date cannot be later than 1 year from today');
  });

  it('keeps the free opening limit at one month', () => {
    const errors = validateOpeningForm(formForRange(addDays(addMonths(today, 1), 1)), today, false);

    expect(errors.dateRangeEnd).toBe('End date cannot be later than 1 month from today');
  });

  it('parses date inputs in local time', () => {
    const parsed = parseDateInput(format(today, 'yyyy-MM-dd'));

    expect(parsed.getFullYear()).toBe(today.getFullYear());
    expect(parsed.getMonth()).toBe(today.getMonth());
    expect(parsed.getDate()).toBe(today.getDate());
  });

  it('uses one-year calendar bounds for premium users', () => {
    const premiumLimit = getDateBounds(true).maxDate;

    expect(isDisabledDate(premiumLimit, true)).toBe(false);
    expect(isDisabledDate(addDays(premiumLimit, 1), true)).toBe(true);
  });

  it('keeps one-month calendar bounds for free users', () => {
    const freeLimit = getDateBounds(false).maxDate;

    expect(isDisabledDate(freeLimit, false)).toBe(false);
    expect(isDisabledDate(addDays(freeLimit, 1), false)).toBe(true);
  });
});
