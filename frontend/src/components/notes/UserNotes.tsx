'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, X } from 'lucide-react';
import type { ActiveUserNote } from '@/api';
import { NOTE_TYPES, describeExpiry, formatNoteDate, mostSevere, summarize } from './note-types';

/** One note: its type, how long it still counts, the text and who wrote it. */
export function NoteCard({ note, compact = false }: { note: ActiveUserNote; compact?: boolean }) {
  const style = NOTE_TYPES[note.type];
  const Icon = style.icon;
  return (
    <div className={`rounded-xl border ${style.card} ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.badge}`}>
          <Icon size={12} /> {style.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
          <Clock size={11} /> {describeExpiry(note.expiresAt)}
        </span>
      </div>
      <p className={`mt-2 whitespace-pre-wrap break-words text-gray-200 ${compact ? 'text-sm' : 'text-sm leading-relaxed'}`}>{note.content}</p>
      <p className="mt-2 text-[11px] text-gray-500">
        {note.authorName || 'Onbekend'} · {formatNoteDate(note.createdAt)}
      </p>
    </div>
  );
}

/**
 * A small flag next to someone's name when they have notes that still count, coloured by the most serious one.
 * Clicking it opens those notes without leaving the page.
 */
export function UserNotesFlag({
  notes,
  userId,
  userName,
  canViewUser,
  label,
}: {
  notes: ActiveUserNote[] | undefined;
  userId: number;
  userName: string;
  canViewUser: boolean;
  /** Text next to the icon, for a wider chip; the count is shown when left out. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const worst = notes ? mostSevere(notes) : null;
  if (!notes || !worst) return null;

  const style = NOTE_TYPES[worst];
  const Icon = style.icon;
  const summary = summarize(notes);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${summary}: klik om te bekijken`}
        aria-label={`${summary} over ${userName} bekijken`}
        className={`relative inline-flex shrink-0 items-center gap-1 rounded-md border font-bold transition-colors ${style.flag} ${label ? 'h-8 px-2.5 text-xs' : 'h-6 px-1.5 text-[11px]'}`}
      >
        <Icon size={13} />
        {label ? <span className="font-semibold">{label}</span> : notes.length > 1 && <span>{notes.length}</span>}
      </button>
      {open && <UserNotesDialog notes={notes} userId={userId} userName={userName} canViewUser={canViewUser} onClose={() => setOpen(false)} />}
    </>
  );
}

function UserNotesDialog({
  notes,
  userId,
  userName,
  canViewUser,
  onClose,
}: {
  notes: ActiveUserNote[];
  userId: number;
  userName: string;
  canViewUser: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const blocked = notes.some((note) => note.type === 'BLOCK');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="user-notes-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actieve notities</p>
            <h2 id="user-notes-title" className="mt-0.5 text-lg font-black text-white">
              {userName}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white" aria-label="Sluiten">
            <X size={20} />
          </button>
        </div>

        {blocked && (
          <div className="mx-5 mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Deze persoon is geblokkeerd en kan niet inloggen. Een bestaande reservatie blijft wel staan.
          </div>
        )}

        <div className="space-y-3 overflow-y-auto p-5">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>

        {canViewUser && (
          <div className="border-t border-slate-800 p-4">
            <Link
              href={`/admin/users/${userId}`}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-300 transition-colors hover:text-white"
            >
              Alle notities en beheer <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
