'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarCheck, CalendarRange, ChevronRight, Settings2 } from 'lucide-react';
import { apiClient } from '@/api';
import type { PlanningTeamSummary } from '@/api';

/** On the profile: the teams you play in, how many planned days you still have to fill in, and a link to the planning. */
export function MyTeams({ isManager }: { isManager: boolean }) {
  const [teams, setTeams] = useState<PlanningTeamSummary[] | null>(null);

  useEffect(() => {
    apiClient
      .GET('/team-planning/my-teams', {})
      .then(({ data }) => setTeams(data ?? []))
      .catch(() => setTeams([]));
  }, []);

  if (teams === null || (teams.length === 0 && !isManager)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarRange size={20} className="text-[#d42422]" /> Mijn teams
        </h2>
        {isManager && (
          <Link href="/admin/team-planning" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <Settings2 size={16} /> Teams beheren
          </Link>
        )}
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-gray-400">Je speelt zelf in geen enkel team.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li key={team.id}>
              <Link
                href={`/teams/schedule?team=${team.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#d42422]/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{team.name}</p>
                  <p className="text-sm text-gray-400">
                    {team.upcomingDays === 0
                      ? 'Nog geen dagen gepland'
                      : `${team.upcomingDays} komende ${team.upcomingDays === 1 ? 'dag' : 'dagen'} gepland`}
                  </p>
                </div>
                {team.daysToFill > 0 ? (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-300">
                    {team.daysToFill} in te vullen
                  </span>
                ) : (
                  team.upcomingDays > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-400">
                      <CalendarCheck size={16} /> Ingevuld
                    </span>
                  )
                )}
                <ChevronRight size={18} className="shrink-0 text-gray-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
