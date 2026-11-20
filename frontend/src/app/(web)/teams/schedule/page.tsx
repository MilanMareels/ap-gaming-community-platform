'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { apiClient } from '@/api';
import type { PlanningTeamSummary, PlanningTeamView } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { PlanningGrid } from '@/components/planning/PlanningGrid';

/** Where players fill in when they can play on the days their team planned. */
export default function TeamPlanningPage() {
  const [teams, setTeams] = useState<PlanningTeamSummary[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [past, setPast] = useState(false);
  const [view, setView] = useState<PlanningTeamView | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .GET('/team-planning/my-teams', {})
      .then(({ data }) => {
        const list = data ?? [];
        setTeams(list);
        const requested = Number(new URLSearchParams(window.location.search).get('team'));
        setTeamId(list.find((team) => team.id === requested)?.id ?? list[0]?.id ?? null);
      })
      .catch(() => setTeams([]));
  }, []);

  const load = useCallback(
    () =>
      teamId === null
        ? Promise.resolve()
        : apiClient
            .GET('/team-planning/teams/{teamId}', { params: { path: { teamId }, query: { past } } })
            .then(({ data, error: apiError }) => {
              if (apiError || !data) {
                setError(getApiErrorMessage(apiError as { message?: string | string[] }, 'De planning kon niet geladen worden.'));
                return;
              }
              setView(data);
              setVersion((v) => v + 1);
            }),
    [teamId, past],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onError = useCallback(
    (message: string) => {
      setError(message);
      load();
    },
    [load],
  );

  if (teams === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-[#d42422]" />
      </div>
    );
  }

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
            Je zit nog in geen enkel team. Je teammanager kan je toevoegen.
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
              <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-sm">
                {[
                  { value: false, label: 'Komende dagen' },
                  { value: true, label: 'Voorbije dagen' },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setPast(option.value)}
                    className={`rounded-md px-3 py-1.5 font-semibold ${past === option.value ? 'bg-[#d42422] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {view && !past && view.team.daysToFill > 0 && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-300">
                  Nog {view.team.daysToFill} {view.team.daysToFill === 1 ? 'dag' : 'dagen'} in te vullen
                </span>
              )}
              {view?.canManage && (
                <Link
                  href={`/admin/team-planning?team=${view.team.id}`}
                  className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white"
                >
                  <Settings2 size={16} /> Team beheren
                </Link>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">
                {error}
                <button onClick={() => setError('')} className="text-red-300 hover:text-white">
                  Sluiten
                </button>
              </div>
            )}

            {view && (
              <div className="mt-6">
                <PlanningGrid
                  key={version}
                  view={view}
                  onError={onError}
                  emptyText={past ? 'Er zijn nog geen voorbije dagen.' : 'Je team heeft nog geen dagen gepland.'}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
