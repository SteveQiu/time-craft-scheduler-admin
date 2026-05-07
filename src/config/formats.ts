export const LOCALE = 'en-US';

export const DATE_FORMATS = {
  /** "Monday, January 1, 2024" — full weekday + month + day + year */
  long: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  } as Intl.DateTimeFormatOptions,

  /** "Monday, Jan 1" — weekday + abbreviated month + day (no year) */
  weekdayShort: {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  } as Intl.DateTimeFormatOptions,
} as const;

export const TIME_FORMATS = {
  /** "14:30" — 24-hour HH:MM, no AM/PM */
  time24: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  } as Intl.DateTimeFormatOptions,
} as const;
