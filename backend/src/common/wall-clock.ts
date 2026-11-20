// Reservation times are stored as the hub's local wall-clock time tagged as UTC:
// a session at 14:00 in Antwerp is stored as 14:00Z, whatever the server's timezone.
export const HUB_TIME_ZONE = 'Europe/Brussels';

/** The current hub wall-clock time in the same convention as stored reservation times. */
export function wallClockNow(now = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: HUB_TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  );
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
}
