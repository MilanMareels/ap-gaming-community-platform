import type { TimeTableEntry } from '@/api';
import { eventDescription } from '@/util/event-seo';
import { HUB_LOCATION, ORGANIZATION, SITE_DESCRIPTION, SITE_NAME, getSiteUrl, stripHtml, truncate } from '@/util/seo';
import { getActiveJobs, getTimetable, getUpcomingEvents } from '@/util/server-api';

const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

// Timetable times are stored as UTC timestamps that represent wall-clock time (same as the schedule page).
const wallClock = (value: string) => (/^\d{2}:\d{2}$/.test(value) ? value : new Date(value).toISOString().slice(11, 16));

function formatTimetable(entries: TimeTableEntry[]): string[] {
  const byDay = new Map<number, string[]>();
  for (const entry of [...entries].sort((a, b) => (a.dayOfWeek || 7) - (b.dayOfWeek || 7) || a.startTime.localeCompare(b.startTime))) {
    const day = entry.dayOfWeek || 7;
    const slot = `${wallClock(entry.startTime)}–${wallClock(entry.endTime)} ${entry.type === 'OPEN' ? 'open' : 'gesloten'}${entry.label ? ` (${entry.label})` : ''}`;
    byDay.set(day, [...(byDay.get(day) ?? []), slot]);
  }
  return [...byDay].map(([day, slots]) => `- ${DAY_NAMES[day]}: ${slots.join(', ')}`);
}

/** Plain-text site summary for LLMs and AI search crawlers (https://llmstxt.org). */
export async function GET() {
  const [siteUrl, events, jobs, timetable] = await Promise.all([getSiteUrl(), getUpcomingEvents(), getActiveJobs(), getTimetable()]);
  const link = (title: string, path: string, description: string) => `- [${title}](${siteUrl}${path}): ${description}`;

  const sections = [
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION}`,
    [
      `${ORGANIZATION.name} is de officiële gaming- en esportsvereniging van ${ORGANIZATION.parentName}. De fysieke Gaming Hub ligt op Campus Ellermanstraat (${HUB_LOCATION.streetAddress}, ${HUB_LOCATION.postalCode} ${HUB_LOCATION.addressLocality}).`,
      'In de hub staan high-end gaming pc\'s, PlayStation 5- en Nintendo Switch-consoles en een console lounge. Studenten reserveren een setup online en krijgen een bevestiging met QR-code per mail. De voertaal van de site is Nederlands.',
    ].join('\n\n'),
    ['## Pagina\'s',
      link('Reserveren', '/reservations', 'reserveer een gaming pc, PS5 of Switch voor een tijdslot'),
      link('Openingsuren', '/schedule', 'wanneer de hub open is'),
      link('Evenementen', '/events', 'toernooien, LAN-party\'s en viewing party\'s'),
      link('Esports teams', '/roster', 'de competitieve rosters en spelers van AP Gaming'),
      link('Huisreglement', '/info', 'algemene regels, gedragscode en hardwareregels van de hub'),
      link('Vacatures', '/jobs', 'openstaande functies in de staff en esports teams'),
      link('Reservatie annuleren', '/reservations/how-to-cancel', 'hoe je een reservatie annuleert'),
      link('Twitch', '/twitch', 'livestream van AP Gaming'),
      link('Privacybeleid', '/privacy', 'welke gegevens we verzamelen en waarom'),
    ].join('\n'),
  ];

  if (timetable?.length) sections.push(['## Openingsuren (tijdzone Europe/Brussels)', ...formatTimetable(timetable)].join('\n'));

  if (events?.length) {
    sections.push(['## Komende evenementen', ...events.map((event) => link(event.title, `/events/${event.id}`, eventDescription(event)))].join('\n'));
  }

  if (jobs?.length) {
    sections.push(
      ['## Openstaande vacatures', ...jobs.map((job) => link(job.title, `/jobs/${job.id}`, truncate(job.shortDescription || stripHtml(job.description))))].join('\n'),
    );
  }

  sections.push(['## Socials', ...ORGANIZATION.sameAs.map((url) => `- ${url}`)].join('\n'));

  return new Response(`${sections.join('\n\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
