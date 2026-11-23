'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Loader2, Mail, Send, StickyNote, Trash2, TimerOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UserNote, UserNoteType } from '@/api';
import { NOTE_TYPES, describeExpiry, formatNoteDate, isActive } from '@/components/notes/note-types';

type Duration = 'none' | '1d' | '1w' | '1m' | '3m' | 'custom';

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 'none', label: 'Geen einde' },
  { value: '1d', label: '1 dag' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 maand' },
  { value: '3m', label: '3 maanden' },
  { value: 'custom', label: 'Tot…' },
];

/** What a new note of each type lasts unless staff pick something else. */
const DEFAULT_DURATION: Record<UserNoteType, Duration> = { NOTE: 'none', WARNING: '1m', BLOCK: '1w' };

const PLACEHOLDERS: Record<UserNoteType, string> = {
  NOTE: 'Schrijf een notitie voor het team…',
  WARNING: 'Waarom krijgt deze persoon een waarschuwing?',
  BLOCK: 'Waarom wordt deze persoon geblokkeerd?',
};

const SUBMIT_LABELS: Record<UserNoteType, string> = { NOTE: 'Toevoegen', WARNING: 'Waarschuwing geven', BLOCK: 'Blokkeren' };

function endOf(duration: Duration, custom: string): Date | null {
  const end = new Date();
  switch (duration) {
    case 'none':
      return null;
    case '1d':
      end.setDate(end.getDate() + 1);
      return end;
    case '1w':
      end.setDate(end.getDate() + 7);
      return end;
    case '1m':
      end.setMonth(end.getMonth() + 1);
      return end;
    case '3m':
      end.setMonth(end.getMonth() + 3);
      return end;
    case 'custom':
      return custom ? new Date(custom) : null;
  }
}

/** The value a datetime-local input needs for "now", so the picker can't go into the past. */
function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

async function send(path: string, method: string, body?: unknown): Promise<Partial<UserNote>> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

const MAIL_FAILED =
  'De waarschuwing is opgeslagen, maar de mail kon niet verstuurd worden. Probeer het later opnieuw met de mailknop bij de waarschuwing.';

const inputClass =
  'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';

export function UserNotesPanel({
  user,
  notes,
  currentUserId,
  isSelf,
  canEditOthers,
  canBlock,
  onChanged,
  onError,
}: {
  user: { id: number; name: string | null; email: string; isAdmin: boolean };
  notes: UserNote[];
  currentUserId: number;
  isSelf: boolean;
  canEditOthers: boolean;
  canBlock: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [type, setType] = useState<UserNoteType>('NOTE');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState<Duration>('none');
  const [customEnd, setCustomEnd] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyNote, setBusyNote] = useState<number | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  const { active, ended } = useMemo(() => {
    const severity: Record<UserNoteType, number> = { BLOCK: 0, WARNING: 1, NOTE: 2 };
    const sorted = [...notes].sort((a, b) => severity[a.type] - severity[b.type] || b.createdAt.localeCompare(a.createdAt));
    return { active: sorted.filter((note) => isActive(note)), ended: sorted.filter((note) => !isActive(note)) };
  }, [notes]);

  const blockUnavailable = !canBlock
    ? 'Je hebt de permissie users.block nodig om te blokkeren.'
    : isSelf
      ? 'Je kan jezelf niet blokkeren.'
      : user.isAdmin
        ? 'Een admin kan niet geblokkeerd worden.'
        : null;

  const chooseType = (next: UserNoteType) => {
    setType(next);
    setDuration(DEFAULT_DURATION[next]);
    setSendEmail(false);
  };

  const end = endOf(duration, customEnd);
  const customInvalid = duration === 'custom' && (!customEnd || new Date(customEnd) <= new Date());
  const name = user.name || user.email;

  const submit = async () => {
    if (!content.trim() || customInvalid) return;
    if (type === 'BLOCK') {
      const until = end ? `tot ${formatNoteDate(end.toISOString())}` : 'zonder einddatum';
      if (!confirm(`${name} blokkeren ${until}? Zolang de blokkade loopt, kan deze persoon niet inloggen.`)) return;
    }
    setSubmitting(true);
    try {
      const emailing = type === 'WARNING' && sendEmail;
      const saved = await send(`/users/${user.id}/notes`, 'POST', {
        content: content.trim(),
        type,
        expiresAt: end?.toISOString(),
        sendEmail: emailing,
      });
      setContent('');
      chooseType('NOTE');
      await onChanged();
      if (emailing && !saved.emailedAt) onError(MAIL_FAILED);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Notitie toevoegen mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  const mayChange = (note: UserNote) => (note.authorId === currentUserId || canEditOthers) && (note.type !== 'BLOCK' || canBlock);

  const endNote = async (note: UserNote) => {
    const question =
      note.type === 'BLOCK' ? `De blokkade van ${name} nu opheffen?` : 'Deze notitie nu beëindigen? Ze blijft bewaard bij de afgelopen notities.';
    if (!confirm(question)) return;
    setBusyNote(note.id);
    try {
      await send(`/users/${user.id}/notes/${note.id}`, 'PATCH', { end: true });
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Beëindigen mislukt');
    } finally {
      setBusyNote(null);
    }
  };

  const emailNote = async (note: UserNote) => {
    if (!confirm(`Deze waarschuwing mailen naar ${user.email}? De student krijgt de tekst te zien zoals ze er staat.`)) return;
    setBusyNote(note.id);
    try {
      const saved = await send(`/users/${user.id}/notes/${note.id}`, 'PATCH', { sendEmail: true });
      await onChanged();
      if (!saved.emailedAt) onError(MAIL_FAILED);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Mailen mislukt');
    } finally {
      setBusyNote(null);
    }
  };

  const deleteNote = async (note: UserNote) => {
    if (!confirm('Deze notitie definitief verwijderen? Beëindigen houdt ze bij in de geschiedenis.')) return;
    setBusyNote(note.id);
    try {
      await send(`/users/${user.id}/notes/${note.id}`, 'DELETE');
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Verwijderen mislukt');
    } finally {
      setBusyNote(null);
    }
  };

  const renderNote = (note: UserNote) => {
    const style = NOTE_TYPES[note.type];
    const Icon = style.icon;
    const activeNow = isActive(note);
    const editable = mayChange(note);
    return (
      <div key={note.id} className={`group rounded-lg border p-3 ${activeNow ? style.card : 'border-slate-800 bg-slate-950/60 opacity-70'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
            <Icon size={11} /> {style.label}
          </span>
          {editable && (
            <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              {busyNote === note.id ? (
                <Loader2 size={13} className="animate-spin text-gray-400" />
              ) : (
                <>
                  {activeNow && note.type === 'WARNING' && !note.emailedAt && (
                    <button
                      onClick={() => emailNote(note)}
                      className="rounded p-1 text-gray-500 transition-colors hover:bg-slate-800 hover:text-white"
                      title={`Mailen naar ${user.email}`}
                    >
                      <Mail size={13} />
                    </button>
                  )}
                  {activeNow && (
                    <button
                      onClick={() => endNote(note)}
                      className="rounded p-1 text-gray-500 transition-colors hover:bg-slate-800 hover:text-white"
                      title={note.type === 'BLOCK' ? 'Blokkade opheffen' : 'Nu beëindigen'}
                    >
                      <TimerOff size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNote(note)}
                    className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Verwijderen"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-200">{note.content}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          <span className="font-medium">{note.authorName || 'Onbekend'}</span>
          <span>·</span>
          <span>{formatNoteDate(note.createdAt)}</span>
        </div>
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${activeNow && note.expiresAt ? style.text : 'text-gray-500'}`}>
          <Clock size={11} /> {describeExpiry(note.expiresAt)}
        </div>
        {note.emailedAt && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
            <Mail size={11} /> Gemaild op {formatNoteDate(note.emailedAt)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote size={16} className="text-yellow-500" />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Notities</div>
      </div>

      {/* Composer */}
      <div className="mb-5 space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1" role="radiogroup" aria-label="Soort notitie">
          {(['NOTE', 'WARNING', 'BLOCK'] as const).map((option) => {
            const style = NOTE_TYPES[option];
            const Icon = style.icon;
            const disabled = option === 'BLOCK' && blockUnavailable !== null;
            const selected = type === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                title={disabled ? (blockUnavailable ?? undefined) : undefined}
                onClick={() => chooseType(option)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected ? style.badge : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={13} /> {style.label}
              </button>
            );
          })}
        </div>

        <textarea
          placeholder={PLACEHOLDERS[type]}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className={inputClass + ' resize-none'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
          }}
        />

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Geldig</div>
          <div className="flex flex-wrap gap-1">
            {DURATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  duration === option.value
                    ? 'border-red-500/50 bg-red-500/15 text-red-300'
                    : 'border-slate-700 bg-slate-950 text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <input
              type="datetime-local"
              min={localNow()}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={inputClass + ' mt-2'}
              style={{ colorScheme: 'dark' }}
            />
          )}
          <p className="mt-1.5 text-[11px] text-gray-500">
            {end
              ? `Telt tot ${formatNoteDate(end.toISOString())}, daarna gaat ze naar de afgelopen notities.`
              : 'Blijft actief tot iemand ze beëindigt.'}
          </p>
        </div>

        <div
          className={`rounded-lg border px-3 py-2 text-xs ${type === 'NOTE' ? 'border-slate-800 text-gray-400' : `${NOTE_TYPES[type].card} ${NOTE_TYPES[type].text}`}`}
        >
          {NOTE_TYPES[type].hint}
          {type === 'WARNING' && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-gray-200">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-0.5 accent-amber-500" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Mail size={12} /> Mail deze waarschuwing naar {user.email}
                </span>
                {sendEmail && (
                  <span className="mt-0.5 block text-amber-300/90">De student krijgt de tekst hierboven te zien: schrijf ze voor hen.</span>
                )}
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">Ctrl+Enter om te versturen</span>
          <Button
            size="sm"
            variant={type === 'BLOCK' ? 'danger' : 'primary'}
            onClick={submit}
            disabled={submitting || !content.trim() || customInvalid}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {type === 'WARNING' && sendEmail ? 'Waarschuwing geven en mailen' : SUBMIT_LABELS[type]}
          </Button>
        </div>
      </div>

      {/* Notes */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <StickyNote size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nog geen notities</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actief ({active.length})</div>
            {active.length === 0 ? (
              <p className="text-sm text-gray-500">Geen actieve notities.</p>
            ) : (
              <div className="space-y-2">{active.map(renderNote)}</div>
            )}
          </div>
          {ended.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowEnded((v) => !v)}
                className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
              >
                {showEnded ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Afgelopen ({ended.length})
              </button>
              {showEnded && <div className="space-y-2">{ended.map(renderNote)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
