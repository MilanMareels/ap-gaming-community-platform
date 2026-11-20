'use client';

import { useState } from 'react';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { PlanningAdminDay, PlanningTeamDetail } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { Dialog } from '@/components/planning/Dialog';
import { dayLabel, todayKey } from '@/components/planning/planning';

const errorText = (error: unknown) => getApiErrorMessage(error as { message?: string | string[] }, 'Opslaan is mislukt.');

const WEEKDAYS = [
  { value: 1, label: 'Ma' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Wo' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Vr' },
  { value: 6, label: 'Za' },
  { value: 0, label: 'Zo' },
];

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, hour) => ({ value: String(hour), label: `${hour}:00` }));

/** Every date from `from` to `to` (YYYY-MM-DD) that falls on one of the weekdays. */
function datesBetween(from: string, to: string, weekdays: Set<number>): string[] {
  const dates: string[] = [];
  const day = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (day <= end && dates.length < 62) {
    if (weekdays.has(day.getUTCDay())) dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

/** Plan the dates players should fill in, and change or remove planned days. */
export function DaysTab({ detail, onChanged, onError }: { detail: PlanningTeamDetail; onChanged: () => void; onError: (message: string) => void }) {
  const today = todayKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [weekdays, setWeekdays] = useState(new Set([1, 2, 3, 4, 5, 6, 0]));
  const [startHour, setStartHour] = useState(13);
  const [endHour, setEndHour] = useState(23);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<PlanningAdminDay | null>(null);
  const [showPast, setShowPast] = useState(false);

  const dates = from && to ? datesBetween(from, to, weekdays) : [];
  const players = detail.members.filter((member) => member.isPlayer).length;
  const days = detail.days.filter((day) => showPast || day.date >= today);
  const pastCount = detail.days.length - detail.days.filter((day) => day.date >= today).length;

  const toggleWeekday = (weekday: number) =>
    setWeekdays((current) => {
      const next = new Set(current);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });

  const addDays = async () => {
    setMessage('');
    const { data, error } = await apiClient.POST('/team-planning/admin/teams/{teamId}/days', {
      params: { path: { teamId: detail.team.id } },
      body: { dates, startHour, endHour, note: note.trim() || null },
    });
    if (error || !data) return onError(errorText(error));
    setMessage(
      `${data.added} ${data.added === 1 ? 'dag' : 'dagen'} toegevoegd` + (data.skipped ? `, ${data.skipped} stond${data.skipped === 1 ? '' : 'en'} al gepland` : '') + '.',
    );
    onChanged();
  };

  const removeDay = async (day: PlanningAdminDay) => {
    if (!confirm(`${dayLabel(day.date)} verwijderen? Wat spelers voor die dag invulden, gaat verloren.`)) return;
    const { error } = await apiClient.DELETE('/team-planning/admin/days/{dayId}', { params: { path: { dayId: day.id } } });
    if (error) onError(errorText(error));
    onChanged();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-1 text-sm font-bold text-white">Dagen toevoegen</h3>
        <p className="mb-4 text-xs text-gray-500">Kies een periode en de weekdagen. Spelers vullen enkel de dagen in die hier gepland staan.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Van" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ colorScheme: 'dark' }} />
          <Input label="Tot en met" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ colorScheme: 'dark' }} />
          <Select label="Eerste uur" options={HOUR_OPTIONS.slice(0, 24)} value={String(startHour)} onChange={(e) => setStartHour(Number(e.target.value))} />
          <Select
            label="Tot"
            options={HOUR_OPTIONS.slice(1)}
            value={String(endHour)}
            onChange={(e) => setEndHour(Number(e.target.value))}
            error={endHour > startHour ? undefined : 'Moet na het eerste uur liggen'}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {WEEKDAYS.map((weekday) => (
            <button
              key={weekday.value}
              type="button"
              onClick={() => toggleWeekday(weekday.value)}
              aria-pressed={weekdays.has(weekday.value)}
              className={`w-11 rounded-lg border py-1.5 text-xs font-bold ${weekdays.has(weekday.value) ? 'border-red-500 bg-red-600 text-white' : 'border-slate-700 text-gray-400'}`}
            >
              {weekday.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Input label="Notitie (optioneel)" placeholder="Bijv. voorbereiding finale" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={addDays} disabled={dates.length === 0 || endHour <= startHour}>
            <CalendarPlus size={16} className="mr-1.5 inline" />
            {dates.length === 1 ? '1 dag toevoegen' : `${dates.length} dagen toevoegen`}
          </Button>
          {message && <span className="text-sm text-emerald-400">{message}</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h3 className="text-sm font-bold text-white">Geplande dagen</h3>
          {pastCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Toon {pastCount} voorbije
            </label>
          )}
        </div>
        {days.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">Nog geen dagen gepland.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {days.map((day) => (
              <li key={day.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold capitalize ${day.date < today ? 'text-gray-500' : 'text-white'}`}>{dayLabel(day.date)}</p>
                  <p className="text-xs text-gray-500">
                    {day.startHour}:00 – {day.endHour}:00
                    {day.blocks.length > 0 && ` · ${day.blocks.length} ${day.blocks.length === 1 ? 'blok' : 'blokken'}`}
                    {day.note && ` · ${day.note}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${day.filledBy >= players && players > 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {day.filledBy}/{players} ingevuld
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(day)} aria-label="Bewerken">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => removeDay(day)} aria-label="Verwijderen">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <EditDayDialog
          day={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function EditDayDialog({
  day,
  onClose,
  onSaved,
  onError,
}: {
  day: PlanningAdminDay;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [startHour, setStartHour] = useState(day.startHour);
  const [endHour, setEndHour] = useState(day.endHour);
  const [note, setNote] = useState(day.note ?? '');
  const valid = endHour > startHour;

  const save = async () => {
    const { error } = await apiClient.PATCH('/team-planning/admin/days/{dayId}', {
      params: { path: { dayId: day.id } },
      body: { startHour, endHour, note: note.trim() || null },
    });
    if (error) return onError(errorText(error));
    onSaved();
  };

  return (
    <Dialog title={`${dayLabel(day.date)} bewerken`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Eerste uur" options={HOUR_OPTIONS.slice(0, 24)} value={String(startHour)} onChange={(e) => setStartHour(Number(e.target.value))} />
        <Select
          label="Tot"
          options={HOUR_OPTIONS.slice(1)}
          value={String(endHour)}
          onChange={(e) => setEndHour(Number(e.target.value))}
          error={valid ? undefined : 'Moet na het eerste uur liggen'}
        />
      </div>
      <p className="text-xs text-gray-500">Wat spelers invulden buiten deze uren, wordt verwijderd.</p>
      <Input label="Notitie" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuleren
        </Button>
        <Button className="flex-1" disabled={!valid} onClick={save}>
          Opslaan
        </Button>
      </div>
    </Dialog>
  );
}
