import { createHash } from 'node:crypto';
import type { ReactElement } from 'react';
import { EVENT_CATEGORY_LABELS, formatEventDate, stripHtml } from '@/util/seo';
import {
  getActiveJobs,
  getBracket,
  getEvent,
  getInventory,
  getJob,
  getPointTrial,
  getPublicForm,
  getRosterGames,
  getTimeTrial,
  getTimetable,
  getUpcomingEvents,
} from '@/util/server-api';
import { Chip, DateTile, Frame, Muted, RankRow, Row, Stack, Stat, TrophyIcon, clampText, colors } from './frame';
import { type Photo, photo } from './render';

/** Bump to invalidate every cached card after a design change. */
const DESIGN_VERSION = 2;

export interface Card {
  /** Hash of the design version and the data shown; changes whenever the image would. */
  version: string;
  render: (host: string) => Promise<ReactElement>;
}

function card(path: string[], data: unknown, render: (host: string) => Promise<ReactElement>): Card {
  const version = createHash('sha1')
    .update(JSON.stringify([DESIGN_VERSION, path, data]))
    .digest('base64url')
    .slice(0, 10);
  return { version, render };
}

interface SimpleCard {
  title: string;
  eyebrow?: string;
  photo?: Photo;
  chips?: string[];
  text?: string;
}

function simpleCard(path: string[], spec: SimpleCard): Card {
  return card(path, spec, async (host) => (
    <Frame host={host} title={spec.title} eyebrow={spec.eyebrow} photo={spec.photo && (await photo(spec.photo))}>
      {spec.text || spec.chips ? (
        <Stack>
          {spec.text && <Muted>{clampText(spec.text, 150)}</Muted>}
          {spec.chips && (
            <div style={{ display: 'flex', marginTop: spec.text ? 24 : 0 }}>
              <Row>
                {spec.chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </Row>
            </div>
          )}
        </Stack>
      ) : undefined}
    </Frame>
  ));
}

// ── Static pages ───────────────────────────────────────

const STATIC_PAGES: Record<string, SimpleCard> = {
  home: { title: 'AP Gaming Hub', eyebrow: 'Reserve. Play. Repeat.', photo: 'hub', chips: ["Gaming pc's", 'Consoles', 'Esports', 'Events'] },
  info: { title: 'Huisreglement', eyebrow: 'Gaming Hub', photo: 'setup', chips: ['Algemene regels', 'Gedragscode', 'Hardwareregels'] },
  privacy: { title: 'Privacybeleid', eyebrow: 'AP Gaming', text: 'Welke gegevens we verzamelen, waarom we ze nodig hebben en hoe we ermee omgaan.' },
  twitch: { title: 'Live op Twitch', eyebrow: 'Livestream', photo: 'play', chips: ['twitch.tv/ap_gamingbe'] },
  'how-to-cancel': {
    title: 'Reservatie annuleren',
    eyebrow: 'Reserveren',
    photo: 'hub',
    text: 'Kan je toch niet komen? Geef je plek vrij voor een andere student.',
  },
  login: { title: 'Inloggen', eyebrow: 'AP Gaming Hub', photo: 'hub' },
  profile: { title: 'Mijn profiel', eyebrow: 'AP Gaming Hub', photo: 'hub' },
  'cancel-reservation': { title: 'Reservatie annuleren', eyebrow: 'Reserveren', photo: 'hub' },
  submission: { title: 'Je inzending', eyebrow: 'Formulier', photo: 'setup' },
  'unknown-user': { title: 'Geen toegang', eyebrow: 'AP Gaming Hub' },
};

// ── Data-driven pages ──────────────────────────────────

async function reservationsCard(path: string[]): Promise<Card> {
  const inventory = await getInventory();
  const count = (key: string) => Number(inventory?.find((setting) => setting.key === key)?.value) || 0;
  const stats = (
    [
      [count('pc'), "Gaming pc's"],
      [count('ps5'), 'PS5'],
      [count('switch'), 'Nintendo Switch'],
    ] as const
  ).filter(([amount]) => amount > 0);

  if (!stats.length)
    return simpleCard(path, { title: 'Reserveer je setup', eyebrow: 'Reserveren', photo: 'hub', chips: ["Gaming pc's", 'PS5', 'Switch'] });

  return card(path, stats, async (host) => (
    <Frame host={host} title="Reserveer je setup" eyebrow="Reserveren" photo={await photo('hub')}>
      <Row>
        {stats.map(([amount, label]) => (
          <Stat key={label} value={amount} label={label} />
        ))}
      </Row>
    </Frame>
  ));
}

const DAY_LABELS = ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
const toMinutes = (value: string) => {
  const hhmm = /^\d{2}:\d{2}$/.test(value) ? value : new Date(value).toISOString().slice(11, 16);
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

async function scheduleCard(path: string[]): Promise<Card> {
  const timetable = await getTimetable();
  const slots = (timetable ?? [])
    .filter((entry) => entry.type === 'OPEN')
    .map((entry) => ({ day: entry.dayOfWeek || 7, start: toMinutes(entry.startTime), end: toMinutes(entry.endTime) }))
    .filter((slot) => slot.end > slot.start);

  if (!slots.length)
    return simpleCard(path, { title: 'Openingsuren', eyebrow: 'Gaming Hub', photo: 'hub', text: 'Bekijk wanneer de AP Gaming Hub open is.' });

  const days = [1, 2, 3, 4, 5, ...[6, 7].filter((day) => slots.some((slot) => slot.day === day))];
  const from = Math.floor(Math.min(...slots.map((slot) => slot.start)) / 60) * 60;
  const to = Math.ceil(Math.max(...slots.map((slot) => slot.end)) / 60) * 60;
  const trackWidth = 1072 - 64;
  const x = (minutes: number) => Math.round(((minutes - from) / (to - from)) * trackWidth);
  const rowHeight = days.length > 5 ? 34 : 40;
  const step = Math.ceil((to - from) / 60 / 6) * 60;
  const hourMarks = Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

  return card(path, slots, async (host) => (
    <Frame host={host} title="Openingsuren" eyebrow="Gaming Hub · Campus Ellermanstraat">
      {days.map((day) => (
        <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', width: 64, fontSize: 22, fontWeight: 800, color: colors.muted }}>{DAY_LABELS[day]}</div>
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: trackWidth,
              height: rowHeight,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {slots
              .filter((slot) => slot.day === day)
              .map((slot) => (
                <div
                  key={`${slot.start}-${slot.end}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: x(slot.start),
                    width: x(slot.end) - x(slot.start),
                    height: rowHeight,
                    borderRadius: 10,
                    backgroundImage: 'linear-gradient(90deg, #d42422, #f97316)',
                  }}
                />
              ))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', position: 'relative', marginLeft: 64, width: trackWidth, height: 26 }}>
        {hourMarks.map((minutes) => (
          <div
            key={minutes}
            style={{
              position: 'absolute',
              left: Math.max(0, Math.min(x(minutes) - 27, trackWidth - 54)),
              fontSize: 18,
              fontWeight: 500,
              color: colors.muted,
            }}
          >
            {`${String(minutes / 60).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>
    </Frame>
  ));
}

async function eventsCard(path: string[]): Promise<Card> {
  const events = ((await getUpcomingEvents()) ?? [])
    .slice(0, 3)
    .map(({ id, title, category, startTime, endTime }) => ({ id, title, category, startTime, endTime }));

  if (!events.length) {
    return simpleCard(path, {
      title: 'Evenementen',
      eyebrow: 'AP Gaming',
      photo: 'lounge',
      text: "Toernooien, LAN-party's en viewing party's. Nieuwe evenementen volgen binnenkort.",
    });
  }

  return card(path, events, async (host) => (
    <Frame host={host} title="Komende evenementen" eyebrow="Evenementen">
      {events.map((event) => (
        <div key={event.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <DateTile date={event.startTime} size="small" />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24 }}>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 800 }}>{clampText(event.title, 48)}</div>
            <Muted size={22}>{`${EVENT_CATEGORY_LABELS[event.category]} · ${formatEventDate(event.startTime, event.endTime)}`}</Muted>
          </div>
        </div>
      ))}
    </Frame>
  ));
}

async function rosterCard(path: string[]): Promise<Card> {
  const games = ((await getRosterGames()) ?? [])
    .filter((game) => game.rosterEntries.length)
    .map((game) => ({ name: game.name, players: game.rosterEntries.length, handles: game.rosterEntries.slice(0, 4).map((entry) => entry.handle) }));

  if (!games.length)
    return simpleCard(path, {
      title: 'Esports teams',
      eyebrow: 'AP Gaming',
      photo: 'setup',
      text: 'De competitieve rosters die AP Hogeschool vertegenwoordigen.',
    });

  const shown = games.slice(0, 4);
  return card(path, games, async (host) => (
    <Frame host={host} title="Onze esports teams" eyebrow={`${games.length} ${games.length === 1 ? 'roster' : 'rosters'}`}>
      <div style={{ display: 'flex', gap: 16 }}>
        {shown.map((game) => (
          <div
            key={game.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: (1072 - 16 * (shown.length - 1)) / shown.length,
              padding: '20px 24px',
              borderRadius: 20,
              border: `2px solid ${colors.border}`,
              backgroundColor: 'rgba(10,15,37,0.85)',
            }}
          >
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 800 }}>{clampText(game.name, 18)}</div>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, color: colors.brand, marginTop: 4, marginBottom: 12 }}>
              {`${game.players} ${game.players === 1 ? 'SPELER' : 'SPELERS'}`}
            </div>
            {game.handles.map((handle) => (
              <div key={handle} style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: colors.muted, marginTop: 4 }}>
                {clampText(handle, 20)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  ));
}

async function jobsCard(path: string[]): Promise<Card> {
  const jobs = ((await getActiveJobs()) ?? []).map((job) => job.title);
  if (!jobs.length)
    return simpleCard(path, {
      title: 'Versterk onze teams',
      eyebrow: 'Vacatures',
      photo: 'play',
      text: 'Sluit je aan bij onze staff of esports teams.',
    });

  return card(path, jobs, async (host) => (
    <Frame host={host} title="Versterk onze teams" eyebrow="Vacatures" photo={await photo('play')}>
      <div style={{ display: 'flex', marginBottom: 18 }}>
        <Chip tone="brand">{`${jobs.length} ${jobs.length === 1 ? 'open functie' : 'open functies'}`}</Chip>
      </div>
      {jobs.slice(0, 3).map((title) => (
        <div key={title} style={{ display: 'flex', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
          <span style={{ color: colors.brand, marginRight: 14 }}>→</span>
          {clampText(title, 36)}
        </div>
      ))}
    </Frame>
  ));
}

const DATA_PAGES: Record<string, (path: string[]) => Promise<Card>> = {
  reservations: reservationsCard,
  schedule: scheduleCard,
  events: eventsCard,
  roster: rosterCard,
  jobs: jobsCard,
};

// ── Events ─────────────────────────────────────────────

const notFound = (path: string[], title: string) => simpleCard(path, { title, eyebrow: 'AP Gaming Hub' });

const BRACKET_STATUS: Record<string, string> = {
  DRAFT: 'In voorbereiding',
  GENERATED: 'Klaar om te starten',
  IN_PROGRESS: 'Bezig',
  COMPLETED: 'Afgelopen',
};

const formatTimeMs = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;

async function eventCard(path: string[], id: string): Promise<Card> {
  const event = await getEvent(id);
  if (!event) return notFound(path, 'Evenement niet gevonden');

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const time = (d: Date) => d.toLocaleTimeString('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' });
  const sameDay =
    start.toLocaleDateString('nl-BE', { timeZone: 'Europe/Brussels' }) === end.toLocaleDateString('nl-BE', { timeZone: 'Europe/Brussels' });
  const data = {
    title: event.title,
    category: EVENT_CATEGORY_LABELS[event.category],
    startTime: event.startTime,
    when: sameDay
      ? `${time(start)} – ${time(end)}`
      : `t/m ${end.toLocaleDateString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'long' })}`,
    type: event.type || null,
    past: end.getTime() < Date.now(),
    registrationOpen: event.registrationEnabled && end.getTime() >= Date.now(),
    registrations: event._count?.registrations ?? 0,
  };

  return card(path, data, async (host) => (
    <Frame host={host} title={data.title} eyebrow={data.category} photo={await photo('lounge')}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <DateTile date={data.startTime} />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28 }}>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, marginBottom: 16 }}>{data.when}</div>
          <Row gap={12}>
            {data.past && <Chip>Afgelopen</Chip>}
            {data.registrationOpen && <Chip tone="green">Inschrijvingen open</Chip>}
            {data.registrations > 0 && <Chip>{`${data.registrations} ingeschreven`}</Chip>}
            {data.type && <Chip>{clampText(data.type, 20)}</Chip>}
          </Row>
        </div>
      </div>
    </Frame>
  ));
}

async function bracketCard(path: string[], id: string): Promise<Card> {
  const [event, bracket] = await Promise.all([getEvent(id), getBracket(id)]);
  if (!event) return notFound(path, 'Evenement niet gevonden');

  const final = bracket?.matches.find((match) => match.round === bracket.totalRounds && match.position === 0);
  const playable = bracket?.matches.filter((match) => match.status !== 'BYE') ?? [];
  const data = {
    title: event.title,
    status: bracket ? BRACKET_STATUS[bracket.status] : null,
    participants: bracket?.participants.length ?? 0,
    rounds: bracket?.totalRounds ?? 0,
    played: playable.filter((match) => match.status === 'COMPLETED').length,
    total: playable.length,
    champion: bracket?.status === 'COMPLETED' ? (final?.participants.find((p) => p.isWinner)?.participant?.name ?? null) : null,
    seeds: bracket?.participants.slice(0, 6).map((p) => p.name) ?? [],
  };

  return card(path, data, async (host) => (
    <Frame host={host} title={data.title} eyebrow={data.status ? `Bracket · ${data.status}` : 'Bracket'}>
      {data.champion ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TrophyIcon size={88} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24 }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: colors.muted, letterSpacing: 2 }}>KAMPIOEN</div>
            <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, color: colors.gold, letterSpacing: -1 }}>
              {clampText(data.champion, 28)}
            </div>
            <Muted size={22}>{`${data.participants} deelnemers · ${data.rounds} rondes`}</Muted>
          </div>
        </div>
      ) : data.participants ? (
        <Stack>
          <Row>
            <Stat value={data.participants} label="deelnemers" />
            {data.rounds > 0 && <Stat value={data.rounds} label="rondes" />}
            {data.total > 0 && <Stat value={`${data.played}/${data.total}`} label="matches gespeeld" />}
          </Row>
          <div style={{ display: 'flex', marginTop: 20 }}>
            <Row gap={10}>
              {data.seeds.map((name) => (
                <Chip key={name}>{clampText(name, 18)}</Chip>
              ))}
            </Row>
          </div>
        </Stack>
      ) : (
        <Muted>De bracket wordt binnenkort bekendgemaakt.</Muted>
      )}
    </Frame>
  ));
}

async function leaderboardCard(path: string[], id: string, kind: 'time-trial' | 'point-trial'): Promise<Card> {
  const [event, timeTrial, pointTrial] = await Promise.all([
    getEvent(id),
    kind === 'time-trial' ? getTimeTrial(id) : null,
    kind === 'point-trial' ? getPointTrial(id) : null,
  ]);
  if (!event) return notFound(path, 'Evenement niet gevonden');

  const trial = timeTrial ?? pointTrial;
  const scores = timeTrial
    ? timeTrial.participants.map((p) => ({ name: p.name, score: p.bestTimeMs }))
    : (pointTrial?.participants.map((p) => ({ name: p.name, score: p.bestPoints })) ?? []);
  const ranked = scores.filter((p): p is { name: string; score: number } => p.score != null);
  const data = {
    title: event.title,
    status: trial ? (trial.status === 'COMPLETED' ? 'Eindstand' : 'Live') : null,
    participants: trial?.participants.length ?? 0,
    top: ranked
      .slice(0, 3)
      .map((p) => ({ name: p.name, value: kind === 'time-trial' ? formatTimeMs(p.score) : `${p.score.toLocaleString('nl-BE')} pt` })),
  };
  const label = kind === 'time-trial' ? 'Time trial' : 'Klassement';

  return card(path, data, async (host) => (
    <Frame host={host} title={data.title} eyebrow={data.status ? `${label} · ${data.status}` : label}>
      {data.top.length ? (
        <Stack>
          {data.top.map((entry, i) => (
            <RankRow key={entry.name} rank={i + 1} name={entry.name} value={entry.value} />
          ))}
          <Muted size={22}>{`${data.participants} deelnemers`}</Muted>
        </Stack>
      ) : (
        <Muted>{kind === 'time-trial' ? 'Nog geen tijden gezet. Wie zet de eerste?' : 'Nog geen scores. Wie opent het klassement?'}</Muted>
      )}
    </Frame>
  ));
}

// ── Jobs & forms ───────────────────────────────────────

async function jobCard(path: string[], id: string): Promise<Card> {
  const job = await getJob(id);
  if (!job) return notFound(path, 'Vacature niet gevonden');
  return simpleCard(path, {
    title: job.title,
    eyebrow: 'Vacature',
    photo: 'play',
    text: job.shortDescription || stripHtml(job.description),
    chips: ['Solliciteer nu'],
  });
}

async function formCard(path: string[], cuid: string): Promise<Card> {
  const form = await getPublicForm(cuid);
  if (!form) return notFound(path, 'Formulier niet gevonden');
  const questions = form.fields?.length ?? 0;
  return simpleCard(path, {
    title: form.title,
    eyebrow: 'Formulier',
    photo: 'setup',
    text: form.description || undefined,
    chips: questions ? [`${questions} ${questions === 1 ? 'vraag' : 'vragen'}`] : undefined,
  });
}

// ── Routing ────────────────────────────────────────────

/**
 * Card for an /og/... path, e.g. ['page', 'schedule'], ['event', '7', 'bracket'], ['job', '3'], ['form', '<cuid>'].
 * Null for unknown paths.
 */
export async function resolveCard(path: string[]): Promise<Card | null> {
  const [kind, id, sub, ...rest] = path;
  if (!id || rest.length) return null;

  if (kind === 'page' && !sub) {
    if (DATA_PAGES[id]) return DATA_PAGES[id](path);
    return STATIC_PAGES[id] ? simpleCard(path, STATIC_PAGES[id]) : null;
  }
  if (kind === 'event') {
    if (!sub) return eventCard(path, id);
    if (sub === 'bracket') return bracketCard(path, id);
    if (sub === 'time-trial' || sub === 'point-trial') return leaderboardCard(path, id, sub);
    return null;
  }
  if (kind === 'job' && !sub) return jobCard(path, id);
  if (kind === 'form' && !sub) return formCard(path, id);
  return null;
}

/** Versioned image URL for metadata; the version changes whenever the card's content does. */
export async function cardImage(...path: string[]): Promise<string> {
  const resolved = await resolveCard(path);
  if (!resolved) return cardImage('page', 'home');
  return `/og/${path.map(encodeURIComponent).join('/')}?v=${resolved.version}`;
}
