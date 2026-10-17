import type { Metadata } from 'next';
import type { Event } from '@/api';
import { cardImage } from '@/og/cards';
import { EVENT_CATEGORY_LABELS, formatEventDate, pageMetadata, truncate } from './seo';
import { getEvent } from './server-api';

export function eventDescription(event: Event): string {
  const when = formatEventDate(event.startTime, event.endTime);
  return truncate(event.description ? `${when} · ${event.description}` : `${EVENT_CATEGORY_LABELS[event.category]} in de AP Gaming Hub op ${when}.`);
}

const SUB_PAGES = {
  bracket: { label: 'Bracket', intro: 'Volg de bracket live: matches, uitslagen en wie doorgaat.' },
  'time-trial': { label: 'Leaderboard', intro: 'Bekijk het time trial leaderboard met de snelste tijden.' },
  'point-trial': { label: 'Klassement', intro: 'Bekijk het puntenklassement en wie bovenaan staat.' },
} as const;

export async function eventMetadata(id: string, subPage?: keyof typeof SUB_PAGES): Promise<Metadata> {
  const [event, image] = await Promise.all([getEvent(id), subPage ? cardImage('event', id, subPage) : cardImage('event', id)]);
  if (!event) return pageMetadata({ title: 'Evenement niet gevonden', noindex: true, image });

  if (!subPage) {
    return pageMetadata({ title: event.title, description: eventDescription(event), path: `/events/${event.id}`, image });
  }

  const { label, intro } = SUB_PAGES[subPage];
  return pageMetadata({
    title: `${label} · ${event.title}`,
    description: truncate(`${event.title} (${formatEventDate(event.startTime, event.endTime)}). ${intro}`),
    path: `/events/${event.id}/${subPage}`,
    image,
  });
}
