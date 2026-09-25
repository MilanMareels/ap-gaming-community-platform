'use client';

import { useState, useEffect, use } from 'react';
import { Star, RefreshCw } from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';

interface PointTrialParticipant {
  id: number;
  name: string;
  bestPoints: number | null;
  entries: { id: number }[];
}

interface PointTrial {
  id: number;
  status: 'ACTIVE' | 'COMPLETED';
  participants: PointTrialParticipant[];
}

function formatPoints(pts: number): string {
  return pts.toLocaleString('nl-NL');
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'LIVE',
  COMPLETED: 'Afgelopen',
};

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

export default function KioskPointTrialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [pointTrial, setPointTrial] = useState<PointTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const [eventRes, ptRes] = await Promise.all([
        apiClient.GET('/events/{id}', { params: { path: { id } } }),
        apiClient.GET('/events/{eventId}/point-trial', {
          params: { path: { eventId: id } },
        }),
      ]);
      if (eventRes.data) setEvent(eventRes.data as unknown as Event);
      if (ptRes.data) setPointTrial(ptRes.data as unknown as PointTrial);
      setLastUpdate(new Date());
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-[clamp(1rem,2vh,2rem)] font-black italic tracking-widest">
          LADEN...
        </div>
      </div>
    );
  }

  if (!event || !pointTrial) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-[clamp(1rem,2vh,2rem)] font-bold text-gray-400">
          Puntenklassement niet gevonden
        </p>
      </div>
    );
  }

  const isLive = pointTrial.status === 'ACTIVE';
  const withBest = pointTrial.participants.filter((p) => p.bestPoints !== null);
  const withoutBest = pointTrial.participants.filter((p) => p.bestPoints === null);

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-[clamp(1rem,2vw,3rem)] py-[clamp(0.5rem,1vh,1.5rem)] border-b border-slate-800">
        <div className="flex items-center gap-[clamp(0.5rem,1vw,1.5rem)]">
          <Star className="text-red-500" size={24} />
          <h1 className="text-[clamp(1rem,2.5vh,2.5rem)] font-black italic tracking-tighter uppercase">
            {event.title}
          </h1>
        </div>
        <div className="flex items-center gap-[clamp(0.5rem,1vw,1.5rem)]">
          {isLive && (
            <span className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-[clamp(0.6rem,1vh,1rem)] uppercase tracking-widest animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              LIVE
            </span>
          )}
          <span className="text-gray-500 text-[clamp(0.6rem,1vh,0.8rem)]">
            {STATUS_LABELS[pointTrial.status]}
          </span>
          <span className="text-gray-500 text-[clamp(0.6rem,1vh,0.8rem)]">
            {pointTrial.participants.length} deelnemers
          </span>
          <span className="text-gray-600 text-[clamp(0.5rem,0.8vh,0.7rem)] flex items-center gap-1">
            <RefreshCw size={10} />
            {lastUpdate.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 overflow-auto p-[clamp(0.5rem,1vw,2rem)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left text-gray-500 uppercase">
              <th className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.3rem,0.8vh,1rem)] font-bold text-[clamp(0.6rem,1vh,0.9rem)] w-20">
                #
              </th>
              <th className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.3rem,0.8vh,1rem)] font-bold text-[clamp(0.6rem,1vh,0.9rem)]">
                Naam
              </th>
              <th className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.3rem,0.8vh,1rem)] font-bold text-[clamp(0.6rem,1vh,0.9rem)] text-right">
                Beste score
              </th>
            </tr>
          </thead>
          <tbody>
            {withBest.map((participant, idx) => {
              const rank = idx + 1;
              const rankColor = RANK_COLORS[rank] ?? 'text-gray-500';
              const isTop3 = rank <= 3;

              return (
                <tr
                  key={participant.id}
                  className={`border-b border-slate-800/50 ${isTop3 ? 'bg-white/[0.02]' : ''}`}
                >
                  <td className={`px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] font-black text-[clamp(1rem,2vh,2rem)] ${rankColor}`}>
                    {rank}
                  </td>
                  <td className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] font-bold text-[clamp(0.9rem,1.8vh,1.6rem)] text-white">
                    {participant.name}
                  </td>
                  <td className={`px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] text-right font-mono font-bold text-[clamp(0.9rem,1.8vh,1.6rem)] ${isTop3 ? 'text-white' : 'text-gray-300'}`}>
                    {formatPoints(participant.bestPoints!)} pts
                  </td>
                </tr>
              );
            })}
            {withoutBest.map((participant) => (
              <tr key={participant.id} className="border-b border-slate-800/50">
                <td className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] font-bold text-[clamp(1rem,2vh,2rem)] text-gray-700">
                  -
                </td>
                <td className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] font-bold text-[clamp(0.9rem,1.8vh,1.6rem)] text-gray-600">
                  {participant.name}
                </td>
                <td className="px-[clamp(0.5rem,1vw,1.5rem)] py-[clamp(0.4rem,1vh,1rem)] text-right font-mono text-[clamp(0.9rem,1.8vh,1.6rem)] text-gray-700">
                  -
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
