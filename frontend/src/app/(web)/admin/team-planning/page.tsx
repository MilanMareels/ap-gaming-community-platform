'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarRange, ExternalLink, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { PlanningTeamDetail, PlanningTeamSummary } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { Dialog } from '@/components/planning/Dialog';
import { useAdmin } from '../AdminShell';
import { PlanningTab } from './PlanningTab';
import { DaysTab } from './DaysTab';
import { MembersTab } from './MembersTab';

const errorText = (error: unknown) => getApiErrorMessage(error as { message?: string | string[] }, 'Er ging iets mis.');

const TABS = [
  { id: 'planning', label: 'Planning', icon: CalendarRange },
  { id: 'days', label: 'Dagen', icon: CalendarDays },
  { id: 'members', label: 'Leden', icon: Users },
] as const;

type Tab = (typeof TABS)[number]['id'];

/** Team managers plan their team here: who plays, which days to fill in, and scrims or trainings. */
export default function AdminTeamPlanningPage() {
  const { hasPermission } = useAdmin();
  const isPlanningAdmin = hasPermission('esports.schedule.manage');

  const [teams, setTeams] = useState<PlanningTeamSummary[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PlanningTeamDetail | null>(null);
  const [tab, setTab] = useState<Tab>('planning');
  const [error, setError] = useState('');
  const [teamDialog, setTeamDialog] = useState<'new' | 'edit' | null>(null);

  const loadTeams = useCallback(
    (select?: number) =>
      apiClient.GET('/team-planning/admin/teams', {}).then(({ data, error: apiError }) => {
        if (apiError || !data) return setError(errorText(apiError));
        setTeams(data);
        const requested = select ?? Number(new URLSearchParams(window.location.search).get('team'));
        setTeamId((current) => data.find((team) => team.id === requested)?.id ?? data.find((team) => team.id === current)?.id ?? data[0]?.id ?? null);
      }),
    [],
  );

  const loadDetail = useCallback(
    () =>
      teamId === null
        ? Promise.resolve()
        : apiClient.GET('/team-planning/admin/teams/{teamId}', { params: { path: { teamId } } }).then(({ data, error: apiError }) => {
            if (apiError || !data) return setError(errorText(apiError));
            setDetail(data);
          }),
    [teamId],
  );

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const refresh = useCallback(() => {
    loadDetail();
    loadTeams();
  }, [loadDetail, loadTeams]);

  const deleteTeam = async () => {
    if (!detail || !confirm(`${detail.team.name} verwijderen? Alle dagen en ingevulde beschikbaarheid gaan verloren.`)) return;
    const { error: apiError } = await apiClient.DELETE('/team-planning/admin/teams/{teamId}', { params: { path: { teamId: detail.team.id } } });
    if (apiError) return setError(errorText(apiError));
    setDetail(null);
    setTeamId(null);
    loadTeams();
  };

  return (
    <div>
      <PageHeader
        title="Teamplanning"
        description="Voeg spelers toe, plan de dagen die ze moeten invullen en plan scrims of trainingen."
        actions={
          isPlanningAdmin && (
            <Button onClick={() => setTeamDialog('new')}>
              <Plus size={16} className="mr-1.5 inline" /> Team aanmaken
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError('')} className="text-red-300 hover:text-white">
            Sluiten
          </button>
        </div>
      )}

      {teams && teams.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <EmptyState
            icon={CalendarRange}
            title={isPlanningAdmin ? 'Nog geen teams' : 'Je beheert nog geen team'}
            description={isPlanningAdmin ? 'Maak een team aan en duid een manager aan.' : 'Een beheerder kan je manager van een team maken.'}
          />
        </div>
      )}

      {teams && teams.length > 0 && (
        <>
          {teams.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setTeamId(team.id);
                    setDetail(null);
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${team.id === teamId ? 'border-red-500 bg-red-600/15 text-white' : 'border-slate-800 bg-slate-900 text-gray-400 hover:text-white'}`}
                >
                  <span className="block font-semibold">{team.name}</span>
                  <span className="text-xs text-gray-500">
                    {team.playerCount} spelers · {team.upcomingDays} komende dagen
                  </span>
                </button>
              ))}
            </div>
          )}

          {detail && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white">{detail.team.name}</h2>
                  <p className="text-sm text-gray-500">
                    {detail.team.game && `${detail.team.game} · `}
                    {detail.team.playerCount} spelers · {detail.team.upcomingDays} komende dagen
                  </p>
                </div>
                <Link
                  href={`/teams/schedule?team=${detail.team.id}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white"
                  target="_blank"
                >
                  <ExternalLink size={14} /> Spelerspagina
                </Link>
                <Button variant="secondary" size="sm" onClick={() => setTeamDialog('edit')} aria-label="Team bewerken">
                  <Pencil size={14} />
                </Button>
                {isPlanningAdmin && (
                  <Button variant="danger" size="sm" onClick={deleteTeam} aria-label="Team verwijderen">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>

              <div className="mb-5 flex gap-1 border-b border-slate-800">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === id ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>

              {tab === 'planning' && <PlanningTab key={detail.team.id} teamId={detail.team.id} onError={setError} />}
              {tab === 'days' && <DaysTab detail={detail} onChanged={refresh} onError={setError} />}
              {tab === 'members' && <MembersTab detail={detail} onChanged={refresh} onError={setError} />}
            </>
          )}
        </>
      )}

      {teamDialog && (
        <TeamDialog
          team={teamDialog === 'edit' ? detail?.team : undefined}
          onClose={() => setTeamDialog(null)}
          onSaved={(id) => {
            setTeamDialog(null);
            loadTeams(id);
            loadDetail();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function TeamDialog({
  team,
  onClose,
  onSaved,
  onError,
}: {
  team?: PlanningTeamSummary;
  onClose: () => void;
  onSaved: (teamId: number) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(team?.name ?? '');
  const [game, setGame] = useState(team?.game ?? '');

  const save = async () => {
    const body = { name: name.trim(), game: game.trim() || null };
    const { data, error } = team
      ? await apiClient.PATCH('/team-planning/admin/teams/{teamId}', { params: { path: { teamId: team.id } }, body })
      : await apiClient.POST('/team-planning/admin/teams', { body });
    if (error || !data) return onError(errorText(error));
    onSaved(data.id);
  };

  return (
    <Dialog title={team ? 'Team bewerken' : 'Team aanmaken'} onClose={onClose}>
      <Input label="Naam *" placeholder="Bijv. AP Valorant" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Game" placeholder="Bijv. Valorant" maxLength={60} value={game} onChange={(e) => setGame(e.target.value)} />
      {!team && <p className="text-xs text-gray-500">Duid daarna onder Leden een manager aan; die beheert dan de planning van dit team.</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuleren
        </Button>
        <Button className="flex-1" disabled={!name.trim()} onClick={save}>
          Opslaan
        </Button>
      </div>
    </Dialog>
  );
}
