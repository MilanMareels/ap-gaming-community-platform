'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { AvailabilityStatus, PlanningBlock, PlanningDay, PlanningPlayer, PlanningTeamView } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { DayGrid } from './DayGrid';
import { Dialog } from './Dialog';
import { BLOCK_STYLE, STATUS_STYLE, cellKey, dayLabel, hourLabel, nextStatus, todayKey, type Cell } from './planning';

/** A drag in progress: every cell it passes in one player's column gets the same status. */
interface Paint {
  memberId: number;
  status: AvailabilityStatus | null;
  changed: Map<string, { dayId: number; hour: number }>;
}

type CellChange = { dayId: number; hour: number; status: AvailabilityStatus | null; note?: string | null };

interface PlanningGridProps {
  view: PlanningTeamView;
  /** Called when saving failed, so the page can show the error and reload. */
  onError: (message: string) => void;
  onBlockClick?: (block: PlanningBlock, day: PlanningDay) => void;
  dayActions?: (day: PlanningDay) => ReactNode;
  emptyText: string;
}

/**
 * The planned days of a team, each as a grid. Your own column (everyone's for managers) is editable:
 * tap to cycle, drag to fill several hours, or switch on notes to add a short note to an hour.
 * Render it with a `key` that changes when `view` is reloaded.
 */
export function PlanningGrid({ view, onError, onBlockClick, dayActions, emptyText }: PlanningGridProps) {
  // Edits are kept here optimistically; pages remount the grid (with a new key) when they load fresh data.
  const [cells, setCells] = useState<Record<string, Cell>>(() =>
    Object.fromEntries(view.availability.map((cell) => [cellKey(cell.memberId, cell.dayId, cell.hour), { status: cell.status, note: cell.note ?? null }])),
  );
  const [noteMode, setNoteMode] = useState(false);
  const [editing, setEditing] = useState<{ player: PlanningPlayer; day: PlanningDay; hour: number } | null>(null);
  const paint = useRef<Paint | null>(null);

  const canEdit = useCallback((player: PlanningPlayer) => player.isMe || view.canManage, [view.canManage]);

  const save = useCallback(
    async (memberId: number, changes: CellChange[]) => {
      if (changes.length === 0) return;
      const { error } = await apiClient.PUT('/team-planning/teams/{teamId}/availability', {
        params: { path: { teamId: view.team.id } },
        body: { memberId, cells: changes },
      });
      if (error) onError(getApiErrorMessage(error as { message?: string | string[] }, 'Opslaan is mislukt.'));
    },
    [view.team.id, onError],
  );

  const setCell = (memberId: number, dayId: number, hour: number, status: AvailabilityStatus | null, note?: string | null) =>
    setCells((current) => {
      const key = cellKey(memberId, dayId, hour);
      const next = { ...current };
      if (status === null) delete next[key];
      else next[key] = { status, note: note === undefined ? (current[key]?.note ?? null) : note };
      return next;
    });

  // While painting, follow the pointer to the cell under it (on touch the first cell keeps the events, so look it up).
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = paint.current;
      if (!current) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-member]');
      if (!target || Number(target.dataset.member) !== current.memberId) return;
      const dayId = Number(target.dataset.day);
      const hour = Number(target.dataset.hour);
      const key = cellKey(current.memberId, dayId, hour);
      if (current.changed.has(key)) return;
      current.changed.set(key, { dayId, hour });
      setCell(current.memberId, dayId, hour, current.status);
    };
    const end = () => {
      const current = paint.current;
      paint.current = null;
      if (current) save(current.memberId, [...current.changed.values()].map((cell) => ({ ...cell, status: current.status })));
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [save]);

  const onCellPointerDown = (event: ReactPointerEvent, player: PlanningPlayer, day: PlanningDay, hour: number) => {
    if (noteMode) {
      setEditing({ player, day, hour });
      return;
    }
    event.preventDefault();
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    const status = nextStatus(cells[cellKey(player.memberId, day.id, hour)]?.status);
    paint.current = { memberId: player.memberId, status, changed: new Map([[cellKey(player.memberId, day.id, hour), { dayId: day.id, hour }]]) };
    setCell(player.memberId, day.id, hour, status);
  };

  const today = todayKey();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button variant={noteMode ? 'primary' : 'secondary'} size="sm" onClick={() => setNoteMode((on) => !on)} aria-pressed={noteMode}>
          <StickyNote size={14} className="mr-1.5 inline" /> {noteMode ? 'Notities: tik op een uur' : 'Notitie toevoegen'}
        </Button>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-300">
          {[...Object.values(STATUS_STYLE), ...Object.values(BLOCK_STYLE)].map((style) => (
            <span key={style.label} className="flex items-center gap-1.5">
              <span className={`h-3 w-6 rounded-sm ${style.swatch}`} /> {style.label}
            </span>
          ))}
        </div>
      </div>

      {view.players.length === 0 ? (
        <p className="mt-6 text-gray-400">Dit team heeft nog geen spelers.</p>
      ) : view.days.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/10 bg-[#0a0f25] p-8 text-center text-gray-400">{emptyText}</p>
      ) : (
        // One day per row, full width: with a full team the columns per player get too narrow side by side
        <div className="mt-5 flex flex-col gap-4">
          {view.days.map((day) => (
            <DayGrid
              key={day.id}
              day={day}
              players={view.players}
              cells={cells}
              isToday={day.date === today}
              canEdit={canEdit}
              onCellPointerDown={onCellPointerDown}
              onBlockClick={onBlockClick}
              actions={dayActions?.(day)}
            />
          ))}
        </div>
      )}

      {editing && (
        <CellDialog
          title={`${editing.player.label} · ${dayLabel(editing.day.date)} ${hourLabel(editing.hour)}u`}
          cell={cells[cellKey(editing.player.memberId, editing.day.id, editing.hour)]}
          onClose={() => setEditing(null)}
          onSave={(status, note) => {
            const { player, day, hour } = editing;
            const cleaned = note.trim() || null;
            setCell(player.memberId, day.id, hour, status, cleaned);
            save(player.memberId, [{ dayId: day.id, hour, status, note: cleaned }]);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** Status and a short note for one hour, e.g. "vanaf 20:30". */
function CellDialog({
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
      <Input label="Notitie" placeholder="Bijv. vanaf 20:30" maxLength={40} value={note} disabled={status === null} onChange={(e) => setNote(e.target.value)} />
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
