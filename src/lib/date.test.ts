import { describe, expect, it } from 'vitest';
import { formatDateOnly, formatLocalDate, parseLocalDate } from './date';

describe('date-only helpers', () => {
  it('round-trips a local calendar date without UTC conversion', () => {
    const date = new Date(2026, 7, 27, 23, 30);

    expect(formatLocalDate(date)).toBe('2026-08-27');
    expect(parseLocalDate('2026-08-27')).toEqual(new Date(2026, 7, 27));
  });

  it('formats date-only values on the intended calendar day', () => {
    expect(formatDateOnly('2026-08-27', 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })).toBe('Aug 27, 2026');
  });

  it('rejects invalid date-only values', () => {
    expect(() => parseLocalDate('2026-02-30')).toThrow(RangeError);
    expect(() => parseLocalDate('08/27/2026')).toThrow(RangeError);
  });
});
