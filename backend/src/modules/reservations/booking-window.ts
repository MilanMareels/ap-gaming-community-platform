// Rules for when members may book. All dates use the wall-clock-as-UTC convention (see common/wall-clock.ts).

/** How far ahead the next open day may be looked for. */
export const MAX_ADVANCE_DAYS = 3;

/** Session lengths members can pick, in minutes. */
export const ALLOWED_DURATIONS_MINUTES = [60, 90, 120];

const DAY_MS = 24 * 60 * 60 * 1000;

/** A wall-clock date as YYYY-MM-DD. */
export const wallClockDateKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The days a member may book: today if the hub is open, plus the first open day after today
 * within MAX_ADVANCE_DAYS. Mirrors the date picker on the website and in the app.
 *
 * @param openWeekdays weekdays (0 = Sunday) with an OPEN timetable entry
 * @param now the current hub wall-clock time
 * @returns wall-clock dates as YYYY-MM-DD
 */
export function bookableDays(openWeekdays: ReadonlySet<number>, now: Date): string[] {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days: string[] = [];

  if (openWeekdays.has(today.getUTCDay())) days.push(wallClockDateKey(today));

  for (let i = 1; i <= MAX_ADVANCE_DAYS; i++) {
    const day = new Date(today.getTime() + i * DAY_MS);
    if (openWeekdays.has(day.getUTCDay())) {
      days.push(wallClockDateKey(day));
      break;
    }
  }

  return days;
}

/** Whether a session from start to end has one of the allowed lengths. */
export function hasAllowedDuration(start: Date, end: Date): boolean {
  const minutes = (end.getTime() - start.getTime()) / 60_000;
  return ALLOWED_DURATIONS_MINUTES.includes(minutes);
}

/** The wall-clock calendar day [start, end) that a time falls on. */
export function wallClockDay(time: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate()));
  return { start, end: new Date(start.getTime() + DAY_MS) };
}
