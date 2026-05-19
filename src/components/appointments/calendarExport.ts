import { Appointment } from './types';

// Calendar export helpers
const formatDateForCalendar = (date: string, time: string): Date => {
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
};

const toUTCString = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const toGoogleCalendarUrl = (appointment: Appointment): string => {
  const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
  const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${appointment.service} with ${appointment.worker}`,
    dates: `${toUTCString(startDate)}/${toUTCString(endDate)}`,
    details: appointment.notes || `Appointment for ${appointment.service}`,
    location: appointment.location || '',
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const toOutlookUrl = (appointment: Appointment): string => {
  const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
  const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
  
  const params = new URLSearchParams({
    subject: `${appointment.service} with ${appointment.worker}`,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: appointment.notes || `Appointment for ${appointment.service}`,
    location: appointment.location || '',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

const toICSContent = (appointments: Appointment[]): string => {
  const events = appointments.map(appointment => {
    const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
    const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
    
    return `BEGIN:VEVENT
DTSTART:${toUTCString(startDate)}
DTEND:${toUTCString(endDate)}
SUMMARY:${appointment.service} with ${appointment.worker}
DESCRIPTION:${appointment.notes || `Appointment for ${appointment.service}`}
LOCATION:${appointment.location || ''}
END:VEVENT`;
  }).join('\n');
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PikAppoint//EN
${events}
END:VCALENDAR`;
};

const downloadICS = (appointments: Appointment[]) => {
  const content = toICSContent(appointments);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = appointments.length === 1 
    ? `appointment-${appointments[0].id}.ics` 
    : `appointments-${appointments.length}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

function getWeekStartSunday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=Sun
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatWeekLabel(weekStart: string): string {
  const [wy, wm, wd] = weekStart.split('-').map(Number);
  return new Date(wy, wm - 1, wd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function applyDateFilter(apts: Appointment[], filter: DateFilter): Appointment[] {
  if (filter === 'all') return apts;
  const now = new Date();
  return apts.filter(apt => {
    const [y, m, d] = apt.date.split('-').map(Number);
    const aptDate = new Date(y, m - 1, d);
    if (filter === 'today') {
      return aptDate.toDateString() === now.toDateString();
    }
    if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    }
    if (filter === 'month') {
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function extractProofStoragePath(photoUrl: string): string {
  const publicMarker = '/object/public/payment-proofs/';
  const idx = photoUrl.indexOf(publicMarker);
  if (idx !== -1) return photoUrl.slice(idx + publicMarker.length);
  const signedMarker = '/object/sign/payment-proofs/';
  const idx2 = photoUrl.indexOf(signedMarker);
  if (idx2 !== -1) return photoUrl.slice(idx2 + signedMarker.length).split('?')[0];
  return photoUrl; // Already a storage path
}

export type { DateFilter };
export {
  formatDateForCalendar,
  toUTCString,
  toGoogleCalendarUrl,
  toOutlookUrl,
  toICSContent,
  downloadICS,
  getWeekStartSunday,
  formatWeekLabel,
  applyDateFilter,
  extractProofStoragePath,
};
