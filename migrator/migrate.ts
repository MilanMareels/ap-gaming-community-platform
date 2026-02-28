import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// ────────────────────────────────────────────────────────────────────────────
// Firebase document types (matches old frontend types)
// ────────────────────────────────────────────────────────────────────────────

interface FirebaseEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // "HH:mm - HH:mm"
  type: string;
}

interface FirebaseReservation {
  id: string;
  sNumber: string;
  email: string;
  inventory: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  controllers?: number;
  status?: string; // "booked" | "present" | "not-present"
  createdAt?: string;
}

interface FirebaseHighscore {
  id: string;
  game: string;
  player: string;
  score: number;
  status: string; // "pending" | "approved"
  timestamp?: string;
}

interface RosterPlayer {
  name: string;
  handle: string;
  role: string;
  rank: string;
}

interface FirebaseRosterData {
  [game: string]: RosterPlayer[];
}

interface FirebaseDaySchedule {
  day: string;
  slots: {
    start: string;
    end: string;
    label: string;
    type: 'open' | 'team' | 'closed';
  }[];
}

interface FirebaseSettings {
  settings?: { googleFormUrl?: string };
  lists?: {
    rosterGames?: string[];
    highscoreGames?: string[];
    eventTypes?: string[];
  };
  inventory?: Record<string, number>;
}

interface FirebaseLogs {
  noShows?: (FirebaseReservation & { loggedAt?: string })[];
}

// ────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────────────────────

/** Dutch day names → ISO day-of-week (1 = Monday … 7 = Sunday) */
const DAY_MAP: Record<string, number> = {
  Maandag: 1,
  Dinsdag: 2,
  Woensdag: 3,
  Donderdag: 4,
  Vrijdag: 5,
  Zaterdag: 6,
  Zondag: 7,
};

/** Map old reservation status strings to the new ReservationStatus enum. */
function mapReservationStatus(status?: string): string {
  switch (status) {
    case 'present':
      return 'PRESENT';
    case 'not-present':
      return 'NO_SHOW';
    case 'cancelled':
      return 'CANCELLED';
    case 'booked':
    default:
      return 'RESERVED';
  }
}

/** Combine a "YYYY-MM-DD" date and "HH:mm" time into a UTC Date. */
function parseDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00.000Z`);
}

/**
 * Parse a time-only string ("HH:mm") into a Date anchored at 1970-01-01.
 * The new schema stores timetable times as DateTime; we use a fixed date.
 */
function parseTimeOnly(timeStr: string): Date {
  return new Date(`1970-01-01T${timeStr}:00.000Z`);
}

// ────────────────────────────────────────────────────────────────────────────
// User cache – avoid duplicate inserts
// ────────────────────────────────────────────────────────────────────────────

const userCache = new Map<string, number>();

async function getOrCreateUser(
  client: pg.PoolClient,
  email: string,
  sNumber: string,
  name?: string | null,
): Promise<number> {
  const cacheKey = email.toLowerCase();
  const cached = userCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Try to find existing user by email
  const existing = await client.query<{ id: number }>(
    `SELECT id FROM "User" WHERE email = $1`,
    [email],
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    userCache.set(cacheKey, id);
    return id;
  }

  // Create new user
  const result = await client.query<{ id: number }>(
    `INSERT INTO "User" (name, email, "sNumber") VALUES ($1, $2, $3) RETURNING id`,
    [name ?? null, email, sNumber],
  );

  const id = result.rows[0].id;
  userCache.set(cacheKey, id);
  return id;
}

// ────────────────────────────────────────────────────────────────────────────
// Migration functions
// ────────────────────────────────────────────────────────────────────────────

async function migrateSettings(
  client: pg.PoolClient,
  data: FirebaseSettings | undefined,
) {
  console.log('⚙️  Migrating settings...');

  if (!data) {
    console.log('   No settings data found, skipping.');
    return;
  }

  const settings: [string, string][] = [];

  // Top-level settings
  if (data.settings?.googleFormUrl) {
    settings.push(['googleFormUrl', data.settings.googleFormUrl]);
  }

  // Lists (stored as JSON arrays)
  if (data.lists?.rosterGames) {
    settings.push(['rosterGames', JSON.stringify(data.lists.rosterGames)]);
  }
  if (data.lists?.highscoreGames) {
    settings.push([
      'highscoreGames',
      JSON.stringify(data.lists.highscoreGames),
    ]);
  }
  if (data.lists?.eventTypes) {
    settings.push(['eventTypes', JSON.stringify(data.lists.eventTypes)]);
  }

  // Inventory counts (stored as individual "inventory.<key>" entries)
  if (data.inventory) {
    for (const [key, value] of Object.entries(data.inventory)) {
      settings.push([`inventory.${key}`, String(value)]);
    }
  }

  for (const [key, value] of settings) {
    await client.query(
      `INSERT INTO "Setting" (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    );
  }

  console.log(`   ✅ ${settings.length} settings migrated.`);
}

async function migrateTimetable(
  client: pg.PoolClient,
  schedule: FirebaseDaySchedule[],
) {
  console.log('📅 Migrating timetable...');

  let count = 0;

  for (const day of schedule) {
    const dayOfWeek = DAY_MAP[day.day];
    if (dayOfWeek === undefined) {
      console.warn(`   ⚠️  Unknown day name: "${day.day}", skipping.`);
      continue;
    }

    for (const slot of day.slots) {
      // "team" type slots are event-generated in the old system;
      // they will be covered by the Event migration instead.
      if (slot.type === 'team') {
        continue;
      }

      const type = slot.type === 'open' ? 'OPEN' : 'CLOSED';
      const startTime = parseTimeOnly(slot.start);
      const endTime = parseTimeOnly(slot.end);

      await client.query(
        `INSERT INTO "TimeTableEntry" ("dayOfWeek", "startTime", "endTime", label, type)
         VALUES ($1, $2, $3, $4, $5::"TimeTableType")`,
        [dayOfWeek, startTime, endTime, slot.label, type],
      );
      count++;
    }
  }

  console.log(`   ✅ ${count} timetable entries migrated.`);
}

async function migrateEvents(
  client: pg.PoolClient,
  events: FirebaseEventItem[],
) {
  console.log('🎉 Migrating events...');

  let count = 0;

  for (const event of events) {
    // time format: "HH:mm - HH:mm"
    const timeParts = event.time.split(' - ');
    if (timeParts.length !== 2) {
      console.warn(
        `   ⚠️  Cannot parse time "${event.time}" for event "${event.title}", skipping.`,
      );
      continue;
    }

    const startTime = parseDateTime(event.date, timeParts[0].trim());
    const endTime = parseDateTime(event.date, timeParts[1].trim());

    await client.query(
      `INSERT INTO "Event" (title, "startTime", "endTime", type)
       VALUES ($1, $2, $3, $4)`,
      [event.title, startTime, endTime, event.type],
    );
    count++;
  }

  console.log(`   ✅ ${count} events migrated.`);
}

async function migrateReservations(
  client: pg.PoolClient,
  reservations: FirebaseReservation[],
  noShows: FirebaseReservation[],
) {
  console.log('📋 Migrating reservations...');

  // Combine regular reservations and no-show log entries
  const allReservations: FirebaseReservation[] = [
    ...reservations,
    ...noShows.map((ns) => ({ ...ns, status: 'not-present' })),
  ];

  let count = 0;

  for (const res of allReservations) {
    if (!res.email || !res.sNumber) {
      console.warn(
        `   ⚠️  Reservation ${res.id} missing email or sNumber, skipping.`,
      );
      continue;
    }

    const userId = await getOrCreateUser(client, res.email, res.sNumber);
    const startTime = parseDateTime(res.date, res.startTime);
    const endTime = parseDateTime(res.date, res.endTime);
    const status = mapReservationStatus(res.status);

    await client.query(
      `INSERT INTO "Reservation" ("userId", controllers, email, inventory, "startTime", "endTime", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::"ReservationStatus")`,
      [
        userId,
        res.controllers ?? 0,
        res.email,
        res.inventory,
        startTime,
        endTime,
        status,
      ],
    );
    count++;
  }

  console.log(
    `   ✅ ${count} reservations migrated (${userCache.size} users created/found).`,
  );
}

async function migrateRosters(client: pg.PoolClient, data: FirebaseRosterData) {
  console.log('🎮 Migrating rosters...');

  let gameCount = 0;
  let entryCount = 0;

  for (const [gameName, entries] of Object.entries(data)) {
    // Create the RosterGame
    const gameResult = await client.query<{ id: number }>(
      `INSERT INTO "RosterGame" (name) VALUES ($1) RETURNING id`,
      [gameName],
    );
    const gameId = gameResult.rows[0].id;
    gameCount++;

    for (const entry of entries) {
      // Old roster data only has name/handle/role/rank – no email or sNumber.
      // Create placeholder users so the FK constraint is satisfied.
      // Admins can link these to real accounts later.
      const sanitized = entry.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      const email = `roster_${sanitized}@placeholder.local`;
      const sNumber = `ROSTER_${sanitized}`;

      const userId = await getOrCreateUser(client, email, sNumber, entry.name);

      await client.query(
        `INSERT INTO "RosterEntry" ("userId", "gameId", handle, rank, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, gameId, entry.handle, entry.rank, entry.role],
      );
      entryCount++;
    }
  }

  console.log(
    `   ✅ ${gameCount} games and ${entryCount} roster entries migrated.`,
  );
}

function logHighscores(highscores: FirebaseHighscore[]) {
  if (highscores.length === 0) {
    console.log('🏆 No highscores found.');
    return;
  }

  console.log('🏆 Highscores:');
  console.log(
    `   ⚠️  ${highscores.length} highscores found but no target table exists in the new database schema.`,
  );
  console.log('   They are listed below for manual review:\n');

  for (const hs of highscores) {
    console.log(
      `   [${hs.status.padEnd(8)}] ${hs.game}: ${hs.player} — ${hs.score}`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  AP Gaming Hub — Firebase → PostgreSQL Migration    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Validate env ──────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required in .env');
    process.exit(1);
  }
  if (!firebaseApiKey || !firebaseProjectId) {
    console.error(
      '❌ NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are required in .env',
    );
    process.exit(1);
  }

  // ── Firebase init ─────────────────────────────────────────────────────
  const app = initializeApp({
    apiKey: firebaseApiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseProjectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const firestore = getFirestore(app);

  // ── PostgreSQL init ───────────────────────────────────────────────────
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');
    console.log('✅ Connected to Firebase\n');

    // ── Read all Firebase documents in parallel ─────────────────────────
    console.log('📖 Reading Firebase data...\n');

    const [
      settingsDoc,
      eventsDoc,
      reservationsDoc,
      rostersDoc,
      timetableDoc,
      highscoresDoc,
      logsDoc,
    ] = await Promise.all([
      getDoc(doc(firestore, 'content', 'settings')),
      getDoc(doc(firestore, 'content', 'events')),
      getDoc(doc(firestore, 'content', 'reservations')),
      getDoc(doc(firestore, 'content', 'rosters')),
      getDoc(doc(firestore, 'content', 'timetable')),
      getDoc(doc(firestore, 'content', 'highscores')),
      getDoc(doc(firestore, 'content', 'logs')),
    ]);

    const settingsData = settingsDoc.data() as FirebaseSettings | undefined;
    const eventsData = eventsDoc.data();
    const reservationsData = reservationsDoc.data();
    const rostersData = rostersDoc.data();
    const timetableData = timetableDoc.data();
    const highscoresData = highscoresDoc.data();
    const logsData = logsDoc.data() as FirebaseLogs | undefined;

    const events: FirebaseEventItem[] = eventsData?.events ?? [];
    const reservations: FirebaseReservation[] =
      reservationsData?.reservations ?? [];
    const rosterData: FirebaseRosterData = rostersData?.data ?? {};
    const schedule: FirebaseDaySchedule[] = timetableData?.schedule ?? [];
    const highscores: FirebaseHighscore[] = highscoresData?.highscores ?? [];
    const noShows: FirebaseReservation[] = logsData?.noShows ?? [];

    console.log(`   Events:       ${events.length}`);
    console.log(`   Reservations: ${reservations.length}`);
    console.log(
      `   Roster games: ${Object.keys(rosterData).length} (${Object.values(rosterData).reduce((s, e) => s + e.length, 0)} players)`,
    );
    console.log(`   Timetable:    ${schedule.length} days`);
    console.log(`   Highscores:   ${highscores.length}`);
    console.log(`   No-shows:     ${noShows.length}`);
    console.log();

    // ── Run migration inside a single transaction ───────────────────────
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await migrateSettings(client, settingsData);
      await migrateTimetable(client, schedule);
      await migrateEvents(client, events);
      await migrateReservations(client, reservations, noShows);
      await migrateRosters(client, rosterData);
      logHighscores(highscores);

      await client.query('COMMIT');

      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║  ✅ Migration completed successfully!                ║');
      console.log('╚══════════════════════════════════════════════════════╝');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('\n❌ Migration failed — all changes rolled back.');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
