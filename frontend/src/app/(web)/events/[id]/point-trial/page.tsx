'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Loader, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { Event } from '@/api';

interface PointTrialEntry {
  id: number;
  points: number;
  createdAt: string;
}

interface PointTrialParticipant {
  id: number;
  name: string;
  bestPoints: number | null;
  entries: PointTrialEntry[];
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
  ACTIVE: 'Bezig',
  COMPLETED: 'Afgelopen',
};

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

export default function PublicPointTrialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [pointTrial, setPointTrial] = useState<PointTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
    } catch {
      // Point trial may not exist
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh every 30 seconds when active
  useEffect(() => {
    if (!pointTrial || pointTrial.status !== 'ACTIVE') return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointTrial?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-4">
          <Loader className="text-[#d42422] animate-bounce" size={32} />
          <span className="text-xl font-black italic tracking-widest">LADEN...</span>
        </div>
      </div>
    );
  }

  if (!event || !pointTrial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-6">
        <p className="text-2xl font-bold">Puntenklassement niet gevonden</p>
        <Link
          href={`/events/${id}`}
          className="text-[#d42422] hover:underline font-bold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Terug naar evenement
        </Link>
      </div>
    );
  }

  const withBest = pointTrial.participants.filter((p) => p.bestPoints !== null);
  const withoutBest = pointTrial.participants.filter((p) => p.bestPoints === null);

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <ScrollReveal direction="up">
          <Link
            href={`/events/${id}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Terug naar evenement
          </Link>
        </ScrollReveal>

        <ScrollReveal direction="up">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
                {event.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 bg-[#d42422]/15 text-[#ff6b69] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Star size={12} /> Puntenklassement
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{STATUS_LABELS[pointTrial.status] ?? pointTrial.status}</span>
              <span>&middot;</span>
              <span>{pointTrial.participants.length} deelnemers</span>
              {pointTrial.status === 'ACTIVE' && (
                <span className="flex items-center gap-1 text-red-400">
                  <RefreshCw size={12} className="animate-spin" />
                  Live
                </span>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Leaderboard */}
        <ScrollReveal direction="up">
          <div className="bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500 uppercase text-xs">
                  <th className="px-6 py-4 font-bold w-16">#</th>
                  <th className="px-6 py-4 font-bold">Naam</th>
                  <th className="px-6 py-4 font-bold w-20 text-center">Pogingen</th>
                  <th className="px-6 py-4 font-bold text-right">Beste score</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {withBest.map((participant, idx) => {
                  const rank = idx + 1;
                  const rankColor = RANK_COLORS[rank] ?? 'text-gray-500';
                  const isTop3 = rank <= 3;
                  const isExpanded = expandedId === participant.id;

                  return (
                    <React.Fragment key={participant.id}>
                      <tr
                        className={`border-b border-white/5 transition-colors cursor-pointer hover:bg-white/[0.02] ${isTop3 ? 'bg-white/[0.02]' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : participant.id)}
                      >
                        <td className={`px-6 py-4 font-black text-lg ${rankColor}`}>{rank}</td>
                        <td className="px-6 py-4 font-medium text-white text-base">{participant.name}</td>
                        <td className="px-6 py-4 text-center text-gray-400">{participant.entries.length}</td>
                        <td className={`px-6 py-4 text-right font-mono font-bold text-base ${isTop3 ? 'text-white' : 'text-gray-300'}`}>
                          {formatPoints(participant.bestPoints!)} pts
                        </td>
                        <td className="px-6 py-4">
                          {participant.entries.length > 1 && (isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />)}
                        </td>
                      </tr>

                      {/* Entry history */}
                      {isExpanded && participant.entries.length > 1 && (
                        <tr className="border-b border-white/5">
                          <td colSpan={5} className="px-6 py-0">
                            <div className="py-3 pl-8 border-l-2 border-white/10 ml-2">
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Alle scores</p>
                              <div className="space-y-1">
                                {participant.entries.map((entry, entryIdx) => (
                                  <div key={entry.id} className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600 text-xs w-6">{entryIdx + 1}.</span>
                                    <span className={`font-mono ${entryIdx === 0 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                      {formatPoints(entry.points)} pts
                                    </span>
                                    {entryIdx === 0 && (
                                      <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">Beste</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {withoutBest.map((participant) => (
                  <tr key={participant.id} className="border-b border-white/5">
                    <td className="px-6 py-4 font-bold text-gray-600">-</td>
                    <td className="px-6 py-4 font-medium text-gray-500">{participant.name}</td>
                    <td className="px-6 py-4 text-center text-gray-600">0</td>
                    <td className="px-6 py-4 text-right font-mono text-gray-600">-</td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))}
                {pointTrial.participants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                      Nog geen deelnemers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
