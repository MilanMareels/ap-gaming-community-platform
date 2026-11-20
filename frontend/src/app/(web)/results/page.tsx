'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, PlayCircle, Trophy } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { EsportsMatchResult, EsportsMatchWithTeam } from '@/api';

const RESULT_STYLE: Record<Exclude<EsportsMatchResult, 'UPCOMING'>, { label: string; className: string }> = {
  WIN: { label: 'W', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  LOSS: { label: 'L', className: 'bg-[#d42422]/15 text-[#ff4444] border-[#d42422]/40' },
  DRAW: { label: 'D', className: 'bg-white/10 text-gray-300 border-white/20' },
};

const RESULT_TITLE: Record<Exclude<EsportsMatchResult, 'UPCOMING'>, string> = { WIN: 'Gewonnen', LOSS: 'Verloren', DRAW: 'Gelijkspel' };

function formatMatchDate(iso: string, withTime: boolean) {
  return new Date(iso).toLocaleString('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function MatchRow({ match, showTeam }: { match: EsportsMatchWithTeam; showTeam: boolean }) {
  const upcoming = match.result === 'UPCOMING';
  const style = upcoming ? null : RESULT_STYLE[match.result as Exclude<EsportsMatchResult, 'UPCOMING'>];
  const hasScore = match.ourScore !== null && match.opponentScore !== null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0a0f25]/80 p-5 backdrop-blur-sm transition-colors hover:border-[#d42422]/50 sm:flex-row sm:items-center">
      {style ? (
        <span
          title={RESULT_TITLE[match.result as Exclude<EsportsMatchResult, 'UPCOMING'>]}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl font-black ${style.className}`}
        >
          {style.label}
        </span>
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d42422]/40 bg-[#d42422]/10 text-[#ff4444]">
          <CalendarClock size={22} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-white">
          {showTeam && <span className="text-[#ff4444]">{match.game.name} · </span>}
          AP <span className="text-gray-500">vs</span> {match.opponent}
        </p>
        <p className="mt-0.5 text-sm text-gray-400">
          {formatMatchDate(match.playedAt, upcoming)}
          {match.competition && <span> · {match.competition}</span>}
        </p>
        {match.notes && <p className="mt-2 text-sm text-gray-500">{match.notes}</p>}
      </div>

      <div className="flex items-center gap-4 sm:justify-end">
        {hasScore ? (
          <span className="font-mono text-2xl font-black tracking-tight text-white">
            {match.ourScore} <span className="text-gray-600">–</span> {match.opponentScore}
          </span>
        ) : (
          !upcoming && (
            <span className="text-sm font-bold uppercase tracking-wider text-gray-300">
              {RESULT_TITLE[match.result as Exclude<EsportsMatchResult, 'UPCOMING'>]}
            </span>
          )
        )}
        {match.vodUrl && (
          <a
            href={match.vodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-[#d42422] hover:text-white"
          >
            <PlayCircle size={16} /> Terugkijken
          </a>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [matches, setMatches] = useState<EsportsMatchWithTeam[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .GET('/esports-results', {})
      .then((res) => res.data && setMatches(res.data as EsportsMatchWithTeam[]))
      .catch((err) => console.error('Failed to fetch results:', err))
      .finally(() => setLoading(false));
  }, []);

  // Only teams with at least one result get a tab; teams with just upcoming matches appear under "Alle teams"
  const teams = useMemo(() => {
    const byId = new Map(matches.filter((match) => match.result !== 'UPCOMING').map((match) => [match.game.id, match.game]));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);
  const showTeamNames = teamId === null && new Set(matches.map((match) => match.gameId)).size > 1;

  const shown = teamId === null ? matches : matches.filter((match) => match.gameId === teamId);
  // Soonest first for upcoming matches; results stay newest first, as the API sends them
  const upcoming = shown.filter((match) => match.result === 'UPCOMING').reverse();
  const results = shown.filter((match) => match.result !== 'UPCOMING');
  const record = (['WIN', 'LOSS', 'DRAW'] as const).map((result) => results.filter((match) => match.result === result).length);

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-[#d42422]"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-24 font-sans">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] w-full bg-gradient-to-b from-[#d42422]/10 to-transparent"></div>

      <div className="container relative z-10 mx-auto w-full max-w-4xl">
        <ScrollReveal direction="up">
          <div className="mb-12 text-center">
            {/* Each word carries its own gradient with some right padding, so the italic overhang isn't clipped */}
            <h1 className="flex flex-wrap justify-center gap-x-4 text-5xl font-black uppercase italic tracking-tighter sm:text-6xl lg:text-7xl">
              <span className="inline-block bg-gradient-to-r from-[#ff4444] via-[#d42422] via-80% to-[#990000] bg-clip-text pr-[0.12em] text-transparent">
                Esports
              </span>
              <span className="inline-block bg-gradient-to-r from-white via-gray-400 to-gray-500 bg-clip-text pr-[0.12em] text-transparent">
                resultaten
              </span>
            </h1>
            <p className="mt-4 text-lg font-semibold uppercase tracking-widest text-gray-400">Hoe onze teams het doen</p>
          </div>
        </ScrollReveal>

        {matches.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#0a0f25] py-24 text-center text-gray-500 backdrop-blur-sm">
            Er zijn nog geen wedstrijden.
          </div>
        ) : (
          <>
            {teams.length > 1 && (
              <div className="mb-10 flex flex-wrap justify-center gap-3">
                {[{ id: null, name: 'Alle teams' }, ...teams].map((team) => {
                  const active = teamId === team.id;
                  return (
                    <button
                      key={team.id ?? 'all'}
                      onClick={() => setTeamId(team.id)}
                      className={`rounded-full border px-5 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${active ? 'border-[#ff4444] bg-[#d42422] text-white' : 'border-white/10 bg-[#0a0f25] text-gray-400 hover:border-white/30 hover:text-white'}`}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
            )}

            {results.length > 0 && (
              <div className="mb-12 flex justify-center gap-3">
                {record.map((amount, index) => (
                  <div key={index} className="min-w-24 rounded-2xl border border-white/10 bg-[#0a0f25]/80 px-5 py-3 text-center">
                    <p className="text-3xl font-black text-white">{amount}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{['Gewonnen', 'Verloren', 'Gelijk'][index]}</p>
                  </div>
                ))}
              </div>
            )}

            {upcoming.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <CalendarClock size={16} className="text-[#d42422]" /> Komende wedstrijden
                </h2>
                <div className="space-y-3">
                  {upcoming.map((match) => (
                    <MatchRow key={match.id} match={match} showTeam={showTeamNames} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                <Trophy size={16} className="text-[#d42422]" /> Uitslagen
              </h2>
              {results.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-[#0a0f25]/80 p-6 text-center text-gray-500">Nog geen uitslagen.</p>
              ) : (
                <div className="space-y-3">
                  {results.map((match) => (
                    <MatchRow key={match.id} match={match} showTeam={showTeamNames} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
