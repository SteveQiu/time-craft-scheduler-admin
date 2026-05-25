import { describe, it, expect } from 'vitest';
import { getAppointmentTotal, isAppointmentFree } from './utils';
import { Appointment } from '@/components/appointments/types';

function makeAppt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    opening_id: 'opening-1',
    user_id: 'user-1',
    provider_id: 'provider-1',
    worker: 'Alice',
    service: 'Haircut',
    location: null,
    date: '2026-05-24',
    start_time: '10:00:00',
    end_time: '11:00:00',
    duration: 1,
    status: 'confirmed',
    notes: null,
    created_at: '2026-05-01T00:00:00Z',
    hourly_rate: null,
    total: null,
    ...overrides,
  };
}

describe('getAppointmentTotal', () => {
  it('returns appointment.total when present (overrides all else)', () => {
    const appt = makeAppt({ total: 99, hourly_rate: 50, duration: 2 });
    expect(getAppointmentTotal(appt)).toBe(99);
  });

  it('returns 0 when total is 0 (explicit free)', () => {
    const appt = makeAppt({ total: 0, hourly_rate: 50 });
    expect(getAppointmentTotal(appt)).toBe(0);
  });

  it('uses hourly_rate × duration (hours) when total is absent', () => {
    const appt = makeAppt({ hourly_rate: 60, duration: 2 });
    expect(getAppointmentTotal(appt)).toBe(120);
  });

  it('converts duration from minutes when duration > 24 (edge case)', () => {
    // duration=90 means 90 minutes → 1.5 hours
    const appt = makeAppt({ hourly_rate: 60, duration: 90 });
    expect(getAppointmentTotal(appt)).toBe(90); // 60 * (90/60)
  });

  it('treats duration ≤ 24 as hours directly', () => {
    const appt = makeAppt({ hourly_rate: 40, duration: 3 });
    expect(getAppointmentTotal(appt)).toBe(120);
  });

  it('returns 0 when no rate source available', () => {
    const appt = makeAppt({ hourly_rate: null });
    expect(getAppointmentTotal(appt)).toBe(0);
  });

  it('uses appointmentRateMap fallback when no hourly_rate', () => {
    const appt = makeAppt({ hourly_rate: null, duration: 2 });
    const rateMap = new Map([['appt-1', 50]]);
    expect(getAppointmentTotal(appt, { appointmentRateMap: rateMap })).toBe(100);
  });

  it('in org view, uses getWorkerRate over rateMap', () => {
    const appt = makeAppt({ hourly_rate: null, duration: 2, worker: 'Alice' });
    const rateMap = new Map([['appt-1', 30]]);
    const getWorkerRate = (name: string) => name === 'Alice' ? 80 : 0;
    expect(getAppointmentTotal(appt, { isOrgView: true, getWorkerRate, appointmentRateMap: rateMap })).toBe(160);
  });

  it('in org view, getWorkerRate returning 0 is honored (worker explicitly free, ignores rateMap)', () => {
    const appt = makeAppt({ hourly_rate: null, duration: 1, worker: 'Bob' });
    const rateMap = new Map([['appt-1', 45]]);
    const getWorkerRate = (_name: string) => 0;
    expect(getAppointmentTotal(appt, { isOrgView: true, getWorkerRate, appointmentRateMap: rateMap })).toBe(0);
  });

  it('in org view with workerRate=0 and no rateMap entry, returns 0', () => {
    const appt = makeAppt({ hourly_rate: null, duration: 1, worker: 'Bob' });
    const getWorkerRate = (_name: string) => 0;
    expect(getAppointmentTotal(appt, { isOrgView: true, getWorkerRate })).toBe(0);
  });

  it('hourly_rate=0 treated as absent (falls through to rate sources)', () => {
    // hourly_rate of 0 → not > 0, so should skip to rateMap
    const appt = makeAppt({ hourly_rate: 0, duration: 1 });
    const rateMap = new Map([['appt-1', 55]]);
    expect(getAppointmentTotal(appt, { appointmentRateMap: rateMap })).toBe(55);
  });
});

describe('isAppointmentFree', () => {
  it('returns true when total is 0', () => {
    expect(isAppointmentFree(makeAppt({ total: 0 }))).toBe(true);
  });

  it('returns false when total is non-zero', () => {
    expect(isAppointmentFree(makeAppt({ total: 45 }))).toBe(false);
  });

  it('returns true when no rate source and no total', () => {
    expect(isAppointmentFree(makeAppt())).toBe(true);
  });

  it('returns false when computed total is non-zero', () => {
    expect(isAppointmentFree(makeAppt({ hourly_rate: 30, duration: 1 }))).toBe(false);
  });
});
