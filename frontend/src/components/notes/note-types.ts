import { Ban, StickyNote, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { UserNoteType } from '@/api';

type NoteStyle = {
  label: string;
  /** What choosing this type does, shown under the composer. */
  hint: string;
  icon: LucideIcon;
  /** Small pill with the type's name. */
  badge: string;
  /** Card around one note. */
  card: string;
  /** Round icon button that flags someone in a list. */
  flag: string;
  text: string;
};

export const NOTE_TYPES: Record<UserNoteType, NoteStyle> = {
  NOTE: {
    label: 'Notitie',
    hint: 'Alleen zichtbaar voor het team.',
    icon: StickyNote,
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    card: 'border-slate-800 bg-slate-950',
    flag: 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25',
    text: 'text-sky-300',
  },
  WARNING: {
    label: 'Waarschuwing',
    hint: 'Alleen zichtbaar voor het team, en springt in het oog bij reservaties.',
    icon: TriangleAlert,
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    card: 'border-amber-500/30 bg-amber-950/20',
    flag: 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25',
    text: 'text-amber-300',
  },
  BLOCK: {
    label: 'Blokkade',
    hint: 'Zolang de blokkade loopt, kan deze persoon niet inloggen op de site of de app.',
    icon: Ban,
    badge: 'bg-red-500/15 text-red-300 border border-red-500/30',
    card: 'border-red-500/40 bg-red-950/25',
    flag: 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30',
    text: 'text-red-300',
  },
};

const SEVERITY: Record<UserNoteType, number> = { BLOCK: 0, WARNING: 1, NOTE: 2 };

/** The most serious type among these notes, which decides how someone is flagged. */
export function mostSevere(notes: { type: UserNoteType }[]): UserNoteType | null {
  return notes.reduce<UserNoteType | null>((worst, note) => (worst === null || SEVERITY[note.type] < SEVERITY[worst] ? note.type : worst), null);
}

export function isActive(note: { expiresAt: string | null }, now = Date.now()) {
  return note.expiresAt === null || new Date(note.expiresAt).getTime() > now;
}

const dateTime = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatNoteDate = (iso: string) => dateTime.format(new Date(iso));

/** "Nog 3 dagen · tot 26 nov. 2026 18:00", "Geen einddatum" or "Afgelopen op …". */
export function describeExpiry(expiresAt: string | null, now = Date.now()) {
  if (expiresAt === null) return 'Geen einddatum';
  const end = new Date(expiresAt).getTime();
  if (end <= now) return `Afgelopen op ${formatNoteDate(expiresAt)}`;

  const hours = Math.ceil((end - now) / 3_600_000);
  const days = Math.ceil(hours / 24);
  const left = hours < 24 ? `nog ${hours} uur` : `nog ${days} ${days === 1 ? 'dag' : 'dagen'}`;
  return `Tot ${formatNoteDate(expiresAt)} · ${left}`;
}

/** "1 blokkade, 2 waarschuwingen", for a tooltip. */
export function summarize(notes: { type: UserNoteType }[]) {
  const words: Record<UserNoteType, [string, string]> = {
    BLOCK: ['blokkade', 'blokkades'],
    WARNING: ['waarschuwing', 'waarschuwingen'],
    NOTE: ['notitie', 'notities'],
  };
  return (['BLOCK', 'WARNING', 'NOTE'] as const)
    .map((type) => [type, notes.filter((note) => note.type === type).length] as const)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${words[type][count === 1 ? 0 : 1]}`)
    .join(', ');
}
