'use client';

import { useCallback, useEffect, useState } from 'react';
import { Medal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { CreateEsportsMatchDto, EsportsMatchResult, EsportsMatchWithTeam, RosterGame } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';

const RESULT_OPTIONS: { value: EsportsMatchResult; label: string }[] = [
  { value: 'UPCOMING', label: 'Gepland' },
  { value: 'WIN', label: 'Gewonnen' },
  { value: 'LOSS', label: 'Verloren' },
  { value: 'DRAW', label: 'Gelijkspel' },
];

const RESULT_BADGE: Record<EsportsMatchResult, string> = {
  UPCOMING: 'bg-blue-500/15 text-blue-300',
  WIN: 'bg-emerald-500/15 text-emerald-400',
  LOSS: 'bg-red-500/15 text-red-400',
  DRAW: 'bg-slate-700 text-gray-300',
};

interface FormState {
  gameId: string;
  opponent: string;
  competition: string;
  date: string;
  time: string;
  result: EsportsMatchResult;
  ourScore: string;
  opponentScore: string;
  vodUrl: string;
  notes: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function emptyForm(gameId: string): FormState {
  const now = new Date();
  return {
    gameId,
    opponent: '',
    competition: '',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: '19:00',
    result: 'UPCOMING',
    ourScore: '',
    opponentScore: '',
    vodUrl: '',
    notes: '',
  };
}

function toForm(match: EsportsMatchWithTeam): FormState {
  const d = new Date(match.playedAt);
  return {
    gameId: String(match.gameId),
    opponent: match.opponent,
    competition: match.competition ?? '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    result: match.result,
    ourScore: match.ourScore?.toString() ?? '',
    opponentScore: match.opponentScore?.toString() ?? '',
    vodUrl: match.vodUrl ?? '',
    notes: match.notes ?? '',
  };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminEsportsResultsPage() {
  const [matches, setMatches] = useState<EsportsMatchWithTeam[]>([]);
  const [teams, setTeams] = useState<RosterGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EsportsMatchWithTeam | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([apiClient.GET('/esports-results', {}), apiClient.GET('/roster/games', {})])
        .then(([matchesRes, teamsRes]) => {
          if (matchesRes.data) setMatches(matchesRes.data as EsportsMatchWithTeam[]);
          if (teamsRes.data) setTeams(teamsRes.data as RosterGame[]);
        })
        .catch((err) => console.error('Failed to load results:', err))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm(emptyForm(teams[0] ? String(teams[0].id) : ''));
    setError('');
    setEditing('new');
  };

  const openEdit = (match: EsportsMatchWithTeam) => {
    setForm(toForm(match));
    setError('');
    setEditing(match);
  };

  const update = (changes: Partial<FormState>) => setForm((current) => ({ ...current, ...changes }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gameId || !form.opponent.trim() || !form.date || !form.time) {
      setError('Kies een team en vul de tegenstander, datum en tijd in.');
      return;
    }

    const upcoming = form.result === 'UPCOMING';
    const score = (value: string) => (upcoming || value.trim() === '' ? null : Number(value));
    const body: CreateEsportsMatchDto = {
      gameId: Number(form.gameId),
      opponent: form.opponent.trim(),
      competition: form.competition.trim() || null,
      playedAt: new Date(`${form.date}T${form.time}`).toISOString(),
      result: form.result,
      ourScore: score(form.ourScore),
      opponentScore: score(form.opponentScore),
      vodUrl: form.vodUrl.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    setError('');
    const { error: apiError } =
      editing === 'new'
        ? await apiClient.POST('/esports-results', { body })
        : await apiClient.PATCH('/esports-results/{id}', { params: { path: { id: (editing as EsportsMatchWithTeam).id } }, body });
    setSaving(false);

    if (apiError) {
      setError(getApiErrorMessage(apiError as { message?: string | string[] }, 'Opslaan is mislukt.'));
      return;
    }
    setEditing(null);
    await load();
  };

  const remove = async (match: EsportsMatchWithTeam) => {
    if (!confirm(`Wedstrijd tegen ${match.opponent} verwijderen?`)) return;
    await apiClient.DELETE('/esports-results/{id}', { params: { path: { id: match.id } } });
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Esports resultaten"
        description="Uitslagen en geplande wedstrijden van de teams, zichtbaar op de publieke resultatenpagina."
        actions={
          <Button onClick={openNew} disabled={teams.length === 0}>
            <Plus size={16} className="mr-1.5 inline" /> Wedstrijd toevoegen
          </Button>
        }
      />

      {!loading && teams.length === 0 && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          Maak eerst een team aan onder Teams voor je wedstrijden toevoegt.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Laden...</p>
        ) : matches.length === 0 ? (
          <EmptyState icon={Medal} title="Nog geen wedstrijden" description="Voeg een geplande wedstrijd of een uitslag toe." />
        ) : (
          <ul className="divide-y divide-slate-800">
            {matches.map((match) => (
              <li key={match.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${RESULT_BADGE[match.result]}`}>
                  {RESULT_OPTIONS.find((o) => o.value === match.result)?.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {match.game.name} vs {match.opponent}
                    {match.ourScore !== null && match.opponentScore !== null && (
                      <span className="ml-2 font-mono text-gray-300">
                        {match.ourScore}–{match.opponentScore}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDate(match.playedAt)}
                    {match.competition && ` · ${match.competition}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(match)} aria-label="Bewerken">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(match)} aria-label="Verwijderen">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <h2 className="text-xl font-black text-white">{editing === 'new' ? 'Wedstrijd toevoegen' : 'Wedstrijd bewerken'}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 transition-colors hover:text-white" aria-label="Sluiten">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Team *"
                  options={teams.map((team) => ({ value: String(team.id), label: team.name }))}
                  value={form.gameId}
                  onChange={(e) => update({ gameId: e.target.value })}
                />
                <Select
                  label="Resultaat *"
                  options={RESULT_OPTIONS}
                  value={form.result}
                  onChange={(e) => update({ result: e.target.value as EsportsMatchResult })}
                />
              </div>
              <Input label="Tegenstander *" value={form.opponent} onChange={(e) => update({ opponent: e.target.value })} />
              <Input
                label="Competitie"
                placeholder="Bijv. Belgian University League"
                value={form.competition}
                onChange={(e) => update({ competition: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Datum *" type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} style={{ colorScheme: 'dark' }} />
                <Input label="Tijd *" type="time" value={form.time} onChange={(e) => update({ time: e.target.value })} style={{ colorScheme: 'dark' }} />
              </div>
              {form.result !== 'UPCOMING' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Score AP" type="number" min="0" value={form.ourScore} onChange={(e) => update({ ourScore: e.target.value })} />
                  <Input
                    label="Score tegenstander"
                    type="number"
                    min="0"
                    value={form.opponentScore}
                    onChange={(e) => update({ opponentScore: e.target.value })}
                  />
                </div>
              )}
              <Input
                label="Link om terug te kijken"
                type="url"
                placeholder="https://"
                value={form.vodUrl}
                onChange={(e) => update({ vodUrl: e.target.value })}
              />
              <Textarea label="Notities" rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />

              {error && <div className="rounded-xl border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setEditing(null)} className="flex-1">
                  Annuleren
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
