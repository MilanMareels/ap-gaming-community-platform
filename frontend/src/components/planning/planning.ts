import type { AvailabilityStatus, PlanningBlock, PlanningBlockType, PlanningDay } from '@/api';

/** A filled-in hour; a missing cell means the player hasn't said. */
export interface Cell {
  status: AvailabilityStatus;
  note: string | null;
}

export const cellKey = (memberId: number, dayId: number, hour: number) => `${memberId}|${dayId}|${hour}`;

/** Tapping a cell goes empty → available → unavailable → empty. */
export function nextStatus(status: AvailabilityStatus | undefined): AvailabilityStatus | null {
  if (!status) return 'AVAILABLE';
  return status === 'AVAILABLE' ? 'UNAVAILABLE' : null;
}

export const hoursOf = (day: Pick<PlanningDay, 'startHour' | 'endHour'>) =>
  Array.from({ length: day.endHour - day.startHour }, (_, i) => day.startHour + i);

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** "maandag 23/11" */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', timeZone: 'UTC' }).format(d);
  return `${weekday} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export const hourLabel = (hour: number) => `${hour}-${hour + 1}`;

export const blockAt = (blocks: PlanningBlock[], hour: number) => blocks.find((block) => block.startHour <= hour && hour < block.endHour);

export const STATUS_STYLE: Record<AvailabilityStatus, { label: string; cell: string; swatch: string }> = {
  AVAILABLE: { label: 'Beschikbaar', cell: 'bg-emerald-500/85 text-emerald-950', swatch: 'bg-emerald-500' },
  UNAVAILABLE: { label: 'Niet beschikbaar', cell: 'bg-red-600/85 text-red-50', swatch: 'bg-red-600' },
};

export const BLOCK_STYLE: Record<PlanningBlockType, { label: string; cell: string; swatch: string }> = {
  SCRIM: { label: 'Scrim', cell: 'bg-sky-500/85 text-sky-950', swatch: 'bg-sky-500' },
  PRACTICE: { label: 'Training', cell: 'bg-violet-500/85 text-violet-50', swatch: 'bg-violet-500' },
  MATCH: { label: 'Wedstrijd', cell: 'bg-amber-400/90 text-amber-950', swatch: 'bg-amber-400' },
};
