import { describe, it, expect } from '@jest/globals';
import { bookableDays, hasAllowedDuration, wallClockDay } from '../../src/modules/reservations/booking-window.js';

// Wednesday 18 November 2026, 16:30 hub time
const now = new Date('2026-11-18T16:30:00.000Z');
const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;

describe('bookableDays', () => {
  it('offers today and tomorrow when both are open', () => {
    expect(bookableDays(new Set([WED, THU, FRI]), now)).toEqual(['2026-11-18', '2026-11-19']);
  });

  it('skips closed days to the first open one', () => {
    expect(bookableDays(new Set([WED, SAT]), now)).toEqual(['2026-11-18', '2026-11-21']);
  });

  it('leaves today out when it is closed', () => {
    expect(bookableDays(new Set([FRI]), now)).toEqual(['2026-11-20']);
  });

  it('looks no further than 3 days ahead', () => {
    expect(bookableDays(new Set([MON, TUE]), now)).toEqual([]);
    expect(bookableDays(new Set([SUN]), now)).toEqual([]);
  });
});

describe('hasAllowedDuration', () => {
  const start = new Date('2026-11-18T14:00:00.000Z');
  const after = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

  it.each([60, 90, 120])('accepts %i minutes', (m) => expect(hasAllowedDuration(start, after(m))).toBe(true));
  it.each([0, -60, 30, 75, 180])('refuses %i minutes', (m) => expect(hasAllowedDuration(start, after(m))).toBe(false));
});

describe('wallClockDay', () => {
  it('spans the calendar day of the given time', () => {
    const { start, end } = wallClockDay(new Date('2026-11-18T23:30:00.000Z'));
    expect(start.toISOString()).toBe('2026-11-18T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-19T00:00:00.000Z');
  });
});
