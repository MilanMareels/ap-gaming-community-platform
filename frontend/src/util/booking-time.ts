/** 45 → "45 min", 320 → "5u 20m", 1700 → "1d 4u". */
export function formatLeadTime(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  if (m < 1440) return m % 60 ? `${Math.floor(m / 60)}u ${m % 60}m` : `${m / 60}u`;
  const hours = Math.round((m % 1440) / 60);
  return hours ? `${Math.floor(m / 1440)}d ${hours}u` : `${Math.floor(m / 1440)}d`;
}

/**
 * When a reservation was made, relative to its start: "ma 17/11 21:04 · 17u vooraf".
 * Both times are hub wall-clock stored as UTC, so they are read with the UTC getters.
 */
export function formatBookedAt(createdAt: string, startTime: string) {
  const created = new Date(createdAt);
  const day = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][created.getUTCDay()];
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${day} ${created.getUTCDate()}/${created.getUTCMonth() + 1} ${pad(created.getUTCHours())}:${pad(created.getUTCMinutes())}`;
  const lead = (new Date(startTime).getTime() - created.getTime()) / 60_000;
  return { stamp, lead: lead > 0 ? `${formatLeadTime(lead)} vooraf` : 'ter plaatse' };
}
