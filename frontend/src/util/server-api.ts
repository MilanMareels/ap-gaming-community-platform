import type { Event, TimeTableEntry } from '@/api';

/**
 * Server-side reads of public backend endpoints, used for metadata, structured data,
 * the sitemap and llms.txt. Failures resolve to null so a backend hiccup never breaks a page.
 */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface PublicJob {
  id: number;
  title: string;
  shortDescription: string;
  description: string;
  updatedAt?: string;
}

export interface PublicForm {
  cuid: string;
  title: string;
  description: string | null;
  fields?: { id: number }[];
}

export type EventWithCount = Event & { _count?: { registrations: number } };

export interface PublicBracket {
  status: 'DRAFT' | 'GENERATED' | 'IN_PROGRESS' | 'COMPLETED';
  totalRounds: number;
  participants: { id: number; name: string; seed: number | null }[];
  matches: {
    round: number;
    position: number;
    status: string;
    participants: { isWinner: boolean; participant: { name: string } | null }[];
  }[];
}

export interface PublicTimeTrial {
  status: 'ACTIVE' | 'COMPLETED';
  participants: { id: number; name: string; bestTimeMs: number | null }[];
}

export interface PublicPointTrial {
  status: 'ACTIVE' | 'COMPLETED';
  participants: { id: number; name: string; bestPoints: number | null }[];
}

export interface PublicRosterGame {
  id: number;
  name: string;
  rosterEntries: { handle: string; rank: string; role: string | null }[];
}

const isId = (id: string) => /^\d+$/.test(id);

export const getEvent = (id: string) => (isId(id) ? fetchPublic<EventWithCount>(`/events/${id}`) : Promise.resolve(null));
export const getUpcomingEvents = () => fetchPublic<Event[]>('/events');
export const getJob = (id: string) => (isId(id) ? fetchPublic<PublicJob>(`/jobs/${id}`) : Promise.resolve(null));
export const getActiveJobs = () => fetchPublic<PublicJob[]>('/jobs');
export const getPublicForm = (cuid: string) => fetchPublic<PublicForm>(`/forms/public/${encodeURIComponent(cuid)}`);
export const getTimetable = () => fetchPublic<TimeTableEntry[]>('/timetable');
export const getBracket = (eventId: string) => (isId(eventId) ? fetchPublic<PublicBracket>(`/events/${eventId}/bracket`) : Promise.resolve(null));
export const getTimeTrial = (eventId: string) =>
  isId(eventId) ? fetchPublic<PublicTimeTrial>(`/events/${eventId}/time-trial`) : Promise.resolve(null);
export const getPointTrial = (eventId: string) =>
  isId(eventId) ? fetchPublic<PublicPointTrial>(`/events/${eventId}/point-trial`) : Promise.resolve(null);
export const getRosterGames = () => fetchPublic<PublicRosterGame[]>('/roster/games');
export const getInventory = () => fetchPublic<{ key: string; value: string }[]>('/settings/inventory');
