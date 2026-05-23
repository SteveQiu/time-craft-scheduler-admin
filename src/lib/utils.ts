import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns the effective dollar total for an opening or appointment record.
// Prefers persisted `total`; falls back to legacy `hourly_rate * duration` for older rows.
// `duration` > 24 is treated as minutes (some legacy rows store minutes, not hours).
export function getEffectiveTotal(record: {
  total?: number | null;
  hourly_rate?: number | null;
  duration?: number | null;
}): number {
  const total = Number(record.total ?? 0);
  if (record.total != null) return total;
  const rate = Number(record.hourly_rate ?? 0);
  const dur = Number(record.duration ?? 0);
  const hours = dur > 24 ? dur / 60 : dur;
  return rate * hours;
}
