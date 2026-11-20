'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { PlanningBlock, PlanningBlockType, PlanningDay, PlanningTeamView } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { PlanningGrid } from '@/components/planning/PlanningGrid';
import { Dialog } from '@/components/planning/Dialog';
import { BLOCK_STYLE, dayLabel, hoursOf } from '@/components/planning/planning';

const errorText = (error: unknown) => getApiErrorMessage(error as { message?: string | string[] }, 'Opslaan is mislukt.');

/** The team's grid as managers see it: everyone's column is editable and blocks can be planned per day. */
export function PlanningTab({ teamId, onError }: { teamId: number; onError: (message: string) => void }) {
  const [past, setPast] = useState(false);
  const [view, setView] = useState<PlanningTeamView | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<{ day: PlanningDay; block: PlanningBlock | null } | null>(null);

  const load = useCallback(
    () =>
      apiClient.GET('/team-planning/teams/{teamId}', { params: { path: { teamId }, query: { past } } }).then(({ data, error }) => {
        if (error || !data) return onError(errorText(error));
        setView(data);
        setVersion((v) => v + 1);
      }),
    [teamId, past, onError],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleGridError = useCallback(
    (message: string) => {
      onError(message);
      load();
    },
    [onError, load],
  );

  const saveBlock = async (draft: BlockDraft) => {
    if (!editing) return;
    const body = { ...draft, title: draft.title.trim() || null, notes: draft.notes.trim() || null };
    const { error } = editing.block
      ? await apiClient.PATCH('/team-planning/admin/blocks/{blockId}', { params: { path: { blockId: editing.block.id } }, body })
      : await apiClient.POST('/team-planning/admin/days/{dayId}/blocks', { params: { path: { dayId: editing.day.id } }, body });
    if (error) onError(errorText(error));
    setEditing(null);
    load();
  };

  const deleteBlock = async (block: PlanningBlock) => {
    const { error } = await apiClient.DELETE('/team-planning/admin/blocks/{blockId}', { params: { path: { blockId: block.id } } });
    if (error) onError(errorText(error));
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-sm w-fit">
        {[
          { value: false, label: 'Komende dagen' },
          { value: true, label: 'Voorbije dagen' },
        ].map((option) => (
          <button
            key={option.label}
            onClick={() => setPast(option.value)}
            className={`rounded-md px-3 py-1.5 font-semibold ${past === option.value ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view && (
        <PlanningGrid
          key={version}
          view={view}
          onError={handleGridError}
          emptyText={past ? 'Er zijn nog geen voorbije dagen.' : 'Er zijn nog geen dagen gepland. Voeg ze toe onder Dagen.'}
          onBlockClick={(block, day) => setEditing({ day, block })}
          dayActions={(day) => (
            <button
              onClick={() => setEditing({ day, block: null })}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white"
              title="Scrim, training of wedstrijd plannen"
            >
              <Plus size={14} /> Blok
            </button>
          )}
        />
      )}

      {editing && (
        <BlockDialog
          day={editing.day}
          block={editing.block}
          onClose={() => setEditing(null)}
          onSave={saveBlock}
          onDelete={editing.block ? () => deleteBlock(editing.block!) : undefined}
        />
      )}
    </div>
  );
}

interface BlockDraft {
  type: PlanningBlockType;
  title: string;
  startHour: number;
  endHour: number;
  notes: string;
}

function BlockDialog({
  day,
  block,
  onSave,
  onDelete,
  onClose,
}: {
  day: PlanningDay;
  block: PlanningBlock | null;
  onSave: (draft: BlockDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const hours = hoursOf(day);
  const [draft, setDraft] = useState<BlockDraft>(
    block
      ? { type: block.type, title: block.title ?? '', startHour: block.startHour, endHour: block.endHour, notes: block.notes ?? '' }
      : { type: 'SCRIM', title: '', startHour: Math.max(day.startHour, day.endHour - 3), endHour: Math.min(day.endHour, Math.max(day.startHour, day.endHour - 3) + 2), notes: '' },
  );
  const update = (changes: Partial<BlockDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const valid = draft.endHour > draft.startHour;

  return (
    <Dialog title={`${block ? 'Blok bewerken' : 'Blok plannen'} · ${dayLabel(day.date)}`} onClose={onClose}>
      <Select
        label="Soort"
        options={Object.entries(BLOCK_STYLE).map(([value, style]) => ({ value, label: style.label }))}
        value={draft.type}
        onChange={(e) => update({ type: e.target.value as PlanningBlockType })}
      />
      <Input label="Titel" placeholder="Bijv. scrim vs KdG" maxLength={60} value={draft.title} onChange={(e) => update({ title: e.target.value })} />
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
