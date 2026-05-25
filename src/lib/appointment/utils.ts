import { Appointment } from '@/components/appointments/types';

interface AppointmentPricingContext {
  isOrgView?: boolean;
  getWorkerRate?: (name: string) => number;
  appointmentRateMap?: Map<string, number>;
}

function getAppointmentRate(
  appointment: Appointment,
  { isOrgView = false, getWorkerRate, appointmentRateMap }: AppointmentPricingContext = {},
): number {
  if (appointment.hourly_rate != null && Number(appointment.hourly_rate) > 0) {
    return Number(appointment.hourly_rate);
  }

  if (isOrgView) {
    return getWorkerRate?.(appointment.worker) || appointmentRateMap?.get(appointment.id) || 0;
  }

  return appointmentRateMap?.get(appointment.id) || 0;
}

export function getAppointmentTotal(
  appointment: Appointment,
  context: AppointmentPricingContext = {},
): number {
  if (appointment.total != null) {
    return Number(appointment.total);
  }

  const rate = getAppointmentRate(appointment, context);
  if (rate === 0) {
    return 0;
  }

  const durationHours = appointment.duration > 24 ? appointment.duration / 60 : appointment.duration;
  return rate * durationHours;
}

export function isAppointmentFree(
  appointment: Appointment,
  context: AppointmentPricingContext = {},
): boolean {
  return getAppointmentTotal(appointment, context) === 0;
}
