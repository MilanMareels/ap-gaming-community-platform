import type { Metadata } from 'next';
import type { Event } from '@/api';
import { formatEventDate, pageMetadata, truncate } from './seo';
import { getEvent } from './server-api';

const CATEGORY_LABELS: Record<Event['category'], string> = {
  SINGLE_DAY: 'Evenement',
  MULTI_DAY: 'Meerdaags evenement',
  TOURNAMENT_BRACKET: 'Toernooi',
  TOURNAMENT_TIMED: 'Time trial',
  TOURNAMENT_POINTS: 'Puntentoernooi',
};

export function eventDescription(event: Event): string {
  const when = formatEventDate(event.startTime, event.endTime);
  return truncate(event.description ? `${when} · ${event.description}` : `${CATEGORY_LABELS[event.category]} in de AP Gaming Hub op ${when}.`);
}

const SUB_PAGES = {
  bracket: { label: 'Bracket', intro: 'Volg de bracket live: matches, uitslagen en wie doorgaat.' },
  'time-trial': { label: 'Leaderboard', intro: 'Bekijk het time trial leaderboard met de snelste tijden.' },
  'point-trial': { label: 'Klassement', intro: 'Bekijk het puntenklassement en wie bovenaan staat.' },
} as const;

export async function eventMetadata(id: string, subPage?: keyof typeof SUB_PAGES): Promise<Metadata> {
  const event = await getEvent(id);
  if (!event) return pageMetadata({ title: 'Evenement niet gevonden', noindex: true });

  const when = formatEventDate(event.startTime, event.endTime);
  if (!subPage) {
    return pageMetadata({
      title: event.title,
      description: eventDescription(event),
      path: `/events/${event.id}`,
      imageSubtitle: `${CATEGORY_LABELS[event.category]} · ${when}`,
    });
  }

  const { label, intro } = SUB_PAGES[subPage];
  return pageMetadata({
    title: `${label} · ${event.title}`,
    description: truncate(`${event.title} (${when}). ${intro}`),
    path: `/events/${event.id}/${subPage}`,
    imageTitle: event.title,
    imageSubtitle: `${label} · ${when}`,
  });
}
