'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { AvailabilityStatus, TeamScheduleBlock, TeamScheduleBlockType } from '@/api';
import { BLOCK_STYLE, STATUS_STYLE, addDays, dayLabel, type Cell } from './schedule';

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white" aria-label="Sluiten">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </div>
    </div>
  );
}

/** Status and a short note for one hour, e.g. "vanaf 20:30". */
export function CellDialog({
  title,
  cell,
  onSave,
  onClose,
}: {
  title: string;
  cell: Cell | undefined;
  onSave: (status: AvailabilityStatus | null, note: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AvailabilityStatus | null>(cell?.status ?? 'AVAILABLE');
  const [note, setNote] = useState(cell?.note ?? '');

  const options: { value: AvailabilityStatus | null; label: string; swatch: string }[] = [
    { value: 'AVAILABLE', ...STATUS_STYLE.AVAILABLE },
    { value: 'UNAVAILABLE', ...STATUS_STYLE.UNAVAILABLE },
    { value: null, label: 'Leeg', swatch: 'bg-white/10' },
  ];

  return (
    <Dialog title={title} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs font-semibold ${status === option.value ? 'border-white text-white' : 'border-slate-700 text-gray-400'}`}
          >
            <span className={`h-4 w-8 rounded ${option.swatch}`} />
            {option.label}
          </button>
        ))}
      </div>
      <Input
        label="Notitie"
        placeholder="Bijv. vanaf 20:30"
        maxLength={40}
        value={note}
        disabled={status === null}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuleren
        </Button>
        <Button className="flex-1" onClick={() => onSave(status, status === null ? '' : note)}>
          Opslaan
        </Button>
      </div>
    </Dialog>
  );
}

export interface BlockDraft {
  type: TeamScheduleBlockType;
  title: string;
  date: string;
  startHour: number;
  endHour: number;
  notes: string;
}

/** Plan or change a scrim, training or match for the whole team. */
export function BlockDialog({
  block,
  weekStart,
  hours,
  onSave,
  onDelete,
  onClose,
}: {
  block: TeamScheduleBlock | null;
  weekStart: string;
  hours: number[];
  onSave: (draft: BlockDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BlockDraft>(
    block
      ? { type: block.type, title: block.title ?? '', date: block.date, startHour: block.startHour, endHour: block.endHour, notes: block.notes ?? '' }
      : { type: 'SCRIM', title: '', date: weekStart, startHour: hours.at(-3) ?? hours[0], endHour: (hours.at(-3) ?? hours[0]) + 2, notes: '' },
  );
  const update = (changes: Partial<BlockDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const valid = draft.endHour > draft.startHour;

  return (
    <Dialog title={block ? 'Blok bewerken' : 'Blok toevoegen'} onClose={onClose}>
      <Select
        label="Soort"
        options={Object.entries(BLOCK_STYLE).map(([value, style]) => ({ value, label: style.label }))}
        value={draft.type}
        onChange={(e) => update({ type: e.target.value as TeamScheduleBlockType })}
      />
      <Input label="Titel" placeholder="Bijv. scrim vs KdG" maxLength={60} value={draft.title} onChange={(e) => update({ title: e.target.value })} />
      <Select
        label="Dag"
        options={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => ({ value: date, label: dayLabel(date) }))}
        value={draft.date}
        onChange={(e) => update({ date: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Van"
          options={hours.map((hour) => ({ value: String(hour), label: `${hour}:00` }))}
          value={String(draft.startHour)}
          onChange={(e) => update({ startHour: Number(e.target.value) })}
        />
        <Select
          label="Tot"
          options={hours.map((hour) => ({ value: String(hour + 1), label: `${hour + 1}:00` }))}
          value={String(draft.endHour)}
          onChange={(e) => update({ endHour: Number(e.target.value) })}
          error={valid ? undefined : 'Moet na het begin liggen'}
        />
      </div>
      <Input label="Notities" maxLength={300} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
      <div className="flex flex-col gap-3 sm:flex-row">
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            Verwijderen
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuleren
        </Button>
        <Button className="flex-1" disabled={!valid} onClick={() => onSave(draft)}>
          Opslaan
        </Button>
      </div>
    </Dialog>
  );
}
