'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { AvailabilityStatus, TeamScheduleBlock, TeamSchedulePlayer, TeamScheduleWeek } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { DayGrid } from './DayGrid';
import { BlockDialog, CellDialog, type BlockDraft } from './Dialogs';
import { BLOCK_STYLE, STATUS_STYLE, addDays, cellKey, dayLabel, hourLabel, nextStatus, todayKey, type Cell } from './schedule';

type Team = { id: number; name: string };

/** A drag in progress: every cell it passes in one player's column gets the same status. */
interface Paint {
  rosterEntryId: number;
  status: AvailabilityStatus | null;
  changed: Map<string, { date: string; hour: number }>;
}

const errorText = (error: unknown) => getApiErrorMessage(error as { message?: string | string[] }, 'Opslaan is mislukt.');

export default function TeamSchedulePage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [week, setWeek] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TeamScheduleWeek | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [error, setError] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ player: TeamSchedulePlayer; date: string; hour: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<TeamScheduleBlock | 'new' | null>(null);
  const paint = useRef<Paint | null>(null);

  useEffect(() => {
    apiClient
      .GET('/team-schedule/games', {})
      .then(({ data: list }) => {
        setTeams(list ?? []);
        if (list?.length) setTeamId(list[0].id);
      })
      .catch(() => setTeams([]));
  }, []);

  const load = useCallback(
    () =>
      teamId === null
        ? Promise.resolve()
        : apiClient
            .GET('/team-schedule/games/{gameId}', { params: { path: { gameId: teamId }, query: { week } } })
            .then(({ data: weekData, error: apiError }) => {
              if (apiError || !weekData) {
                setError(errorText(apiError));
                return;
              }
              setData(weekData);
              setCells(
                Object.fromEntries(
                  weekData.availability.map((cell) => [cellKey(cell.rosterEntryId, cell.date, cell.hour), { status: cell.status, note: cell.note ?? null }]),
                ),
              );
            }),
    [teamId, week],
  );

  useEffect(() => {
    load();
  }, [load]);

  const hours = useMemo(
    () => (data ? Array.from({ length: data.game.scheduleEndHour - data.game.scheduleStartHour }, (_, i) => data.game.scheduleStartHour + i) : []),
    [data],
  );
  const days = useMemo(() => (data ? Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i)) : []), [data]);
  const canEdit = useCallback((player: TeamSchedulePlayer) => player.isMe || !!data?.canManage, [data]);

  const save = useCallback(
    async (rosterEntryId: number, changes: { date: string; hour: number; status: AvailabilityStatus | null; note?: string | null }[]) => {
      if (!data || changes.length === 0) return;
      const { error: apiError } = await apiClient.PUT('/team-schedule/games/{gameId}/availability', {
        params: { path: { gameId: data.game.id } },
        body: { rosterEntryId, cells: changes },
      });
      if (apiError) {
        setError(errorText(apiError));
        load();
      }
    },
    [data, load],
  );

  const setCell = (rosterEntryId: number, date: string, hour: number, status: AvailabilityStatus | null, note?: string | null) =>
    setCells((current) => {
      const key = cellKey(rosterEntryId, date, hour);
      const next = { ...current };
      if (status === null) delete next[key];
      else next[key] = { status, note: note === undefined ? (current[key]?.note ?? null) : note };
      return next;
    });

  // While painting, follow the pointer to whatever cell is under it (touch keeps the first target, so look it up).
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = paint.current;
      if (!current) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-entry]');
      if (!target || Number(target.dataset.entry) !== current.rosterEntryId) return;
      const date = target.dataset.date!;
      const hour = Number(target.dataset.hour);
      const key = cellKey(current.rosterEntryId, date, hour);
      if (current.changed.has(key)) return;
      current.changed.set(key, { date, hour });
      setCell(current.rosterEntryId, date, hour, current.status);
    };
    const end = () => {
      const current = paint.current;
      paint.current = null;
      if (current) save(current.rosterEntryId, [...current.changed.values()].map((cell) => ({ ...cell, status: current.status })));
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

  const onCellPointerDown = (event: ReactPointerEvent, player: TeamSchedulePlayer, date: string, hour: number) => {
    if (noteMode) {
      setEditingCell({ player, date, hour });
      return;
    }
    event.preventDefault();
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    const status = nextStatus(cells[cellKey(player.rosterEntryId, date, hour)]?.status);
    paint.current = { rosterEntryId: player.rosterEntryId, status, changed: new Map([[cellKey(player.rosterEntryId, date, hour), { date, hour }]]) };
    setCell(player.rosterEntryId, date, hour, status);
  };

  const saveBlock = async (draft: BlockDraft) => {
    if (!data) return;
    const body = { ...draft, title: draft.title.trim() || null, notes: draft.notes.trim() || null };
    const { error: apiError } =
      editingBlock === 'new'
        ? await apiClient.POST('/team-schedule/games/{gameId}/blocks', { params: { path: { gameId: data.game.id } }, body })
        : await apiClient.PATCH('/team-schedule/blocks/{id}', { params: { path: { id: (editingBlock as TeamScheduleBlock).id } }, body });
    if (apiError) setError(errorText(apiError));
    setEditingBlock(null);
    load();
  };

  const deleteBlock = async (block: TeamScheduleBlock) => {
    const { error: apiError } = await apiClient.DELETE('/team-schedule/blocks/{id}', { params: { path: { id: block.id } } });
    if (apiError) setError(errorText(apiError));
    setEditingBlock(null);
    load();
  };

  const updateHours = async (scheduleStartHour: number, scheduleEndHour: number) => {
    if (!data || scheduleEndHour <= scheduleStartHour) return;
    const { error: apiError } = await apiClient.PATCH('/team-schedule/games/{gameId}/hours', {
      params: { path: { gameId: data.game.id } },
      body: { scheduleStartHour, scheduleEndHour },
    });
    if (apiError) setError(errorText(apiError));
    load();
  };

  if (teams === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-[#d42422]" />
      </div>
    );
  }

  const today = todayKey();
  const me = data?.players.find((player) => player.isMe);

  return (
    <div className="min-h-screen px-4 py-24 font-sans sm:px-6">
      <div className="mx-auto w-full max-w-[1800px]">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white md:text-6xl">
          Team<span className="text-[#d42422]">planning</span>
        </h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Duid per uur aan wanneer je kan spelen. Tik op een vakje om te wisselen tussen beschikbaar, niet beschikbaar en leeg, of sleep over
          meerdere uren om ze in één keer in te vullen.
        </p>

        {teams.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-white/10 bg-[#0a0f25] p-8 text-center text-gray-400">
            Je staat nog in geen enkel team. Vraag een beheerder om je toe te voegen aan de roster.
          </p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {teams.length > 1 && (
                <select
                  aria-label="Team"
                  value={teamId ?? ''}
                  onChange={(e) => setTeamId(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
              {data && (
                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950">
                  <button className="p-2 text-gray-300 hover:text-white" aria-label="Vorige week" onClick={() => setWeek(addDays(data.weekStart, -7))}>
                    <ChevronLeft size={18} />
                  </button>
                  <button className="px-2 text-sm font-semibold capitalize text-white" onClick={() => setWeek(undefined)} title="Naar deze week">
                    {dayLabel(data.weekStart)} – {dayLabel(addDays(data.weekStart, 6))}
                  </button>
                  <button className="p-2 text-gray-300 hover:text-white" aria-label="Volgende week" onClick={() => setWeek(addDays(data.weekStart, 7))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              <Button variant={noteMode ? 'primary' : 'secondary'} size="sm" onClick={() => setNoteMode((on) => !on)} aria-pressed={noteMode}>
                <StickyNote size={14} className="mr-1.5 inline" /> {noteMode ? 'Notities: tik op een vakje' : 'Notitie toevoegen'}
              </Button>
              {data?.canManage && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setEditingBlock('new')}>
                    <CalendarPlus size={14} className="mr-1.5 inline" /> Blok toevoegen
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    Uren
                    <select
                      aria-label="Eerste uur"
                      value={data.game.scheduleStartHour}
                      onChange={(e) => updateHours(Number(e.target.value), data.game.scheduleEndHour)}
                      className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                    >
                      {Array.from({ length: data.game.scheduleEndHour }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {hour}:00
                        </option>
                      ))}
                    </select>
                    tot
                    <select
                      aria-label="Laatste uur"
                      value={data.game.scheduleEndHour}
                      onChange={(e) => updateHours(data.game.scheduleStartHour, Number(e.target.value))}
                      className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                    >
                      {Array.from({ length: 24 - data.game.scheduleStartHour }, (_, i) => data.game.scheduleStartHour + i + 1).map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-300">
              {[...Object.values(STATUS_STYLE), ...Object.values(BLOCK_STYLE)].map((style) => (
                <span key={style.label} className="flex items-center gap-1.5">
                  <span className={`h-3 w-6 rounded-sm ${style.swatch}`} /> {style.label}
                </span>
              ))}
            </div>

            {error && (
              <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">
                {error}
                <button onClick={() => setError('')} className="text-red-300 hover:text-white">
                  Sluiten
                </button>
              </div>
            )}

            {data && data.players.length === 0 && <p className="mt-8 text-gray-400">Dit team heeft nog geen spelers.</p>}

            {data && data.players.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {days.map((date) => (
                  <DayGrid
                    key={date}
                    date={date}
                    hours={hours}
                    players={data.players}
                    cells={cells}
                    blocks={data.blocks}
                    isToday={date === today}
                    canEdit={canEdit}
                    onCellPointerDown={onCellPointerDown}
                    onBlockClick={data.canManage ? (block) => setEditingBlock(block) : undefined}
                  />
                ))}
              </div>
            )}

            {data && !me && !data.canManage && <p className="mt-6 text-sm text-gray-500">Je kan dit team bekijken maar niet invullen.</p>}
          </>
        )}
      </div>

      {editingCell && (
        <CellDialog
          title={`${editingCell.player.handle} · ${dayLabel(editingCell.date)} ${hourLabel(editingCell.hour)}u`}
          cell={cells[cellKey(editingCell.player.rosterEntryId, editingCell.date, editingCell.hour)]}
          onClose={() => setEditingCell(null)}
          onSave={(status, note) => {
            const { player, date, hour } = editingCell;
            setCell(player.rosterEntryId, date, hour, status, note.trim() || null);
            save(player.rosterEntryId, [{ date, hour, status, note: note.trim() || null }]);
            setEditingCell(null);
          }}
        />
      )}

      {editingBlock && data && (
        <BlockDialog
          block={editingBlock === 'new' ? null : editingBlock}
          weekStart={data.weekStart}
          hours={hours}
          onClose={() => setEditingBlock(null)}
          onSave={saveBlock}
          onDelete={editingBlock === 'new' ? undefined : () => deleteBlock(editingBlock)}
        />
      )}
    </div>
  );
}
