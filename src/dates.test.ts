import { describe, expect, it } from 'vitest';
import { formatDue, isOverdue } from './dates';

describe('dates', () => {
  const now = new Date(2026, 9, 29, 15, 0);

  it('flags past due dates as overdue but not today or the future', () => {
    expect(isOverdue('2026-10-28', false, now)).toBe(true);
    expect(isOverdue('2026-10-29', false, now)).toBe(false);
    expect(isOverdue('2026-10-30', false, now)).toBe(false);
  });

  it('never flags done cards', () => {
    expect(isOverdue('2020-01-01', true, now)).toBe(false);
  });

  it('formats a date without shifting the day, and passes through junk', () => {
    expect(formatDue('2026-10-29')).toContain('29');
    expect(formatDue('soon')).toBe('soon');
  });
});
