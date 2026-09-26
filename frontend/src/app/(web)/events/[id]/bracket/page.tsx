'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Loader, RefreshCw } from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';
import { BracketSVG, type BracketData } from '@/components/bracket/BracketSVG';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Concept',
  GENERATED: 'Klaar om te beginnen',
  IN_PROGRESS: 'Bezig',
  COMPLETED: 'Afgelopen',
};

export default function PublicBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [eventRes, bracketRes] = await Promise.all([
        apiClient.GET('/events/{id}', { params: { path: { id } } }),
        apiClient.GET('/events/{eventId}/bracket', {
          params: { path: { eventId: id } },
        }),
      ]);
      if (eventRes.data) setEvent(eventRes.data as unknown as Event);
      if (bracketRes.data)
        setBracket(bracketRes.data as unknown as BracketData);
    } catch {
      // Bracket may not exist
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh every 30 seconds for live updates
  useEffect(() => {
    if (!bracket || bracket.status === 'COMPLETED' || bracket.status === 'DRAFT')
      return;

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-4">
          <Loader className="text-[#d42422] animate-bounce" size={32} />
          <span className="text-xl font-black italic tracking-widest">
            LADEN...
          </span>
        </div>
      </div>
    );
  }

  if (!event || !bracket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-6">
        <p className="text-2xl font-bold">Bracket niet gevonden</p>
        <Link
          href={`/events/${id}`}
          className="text-[#d42422] hover:underline font-bold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Terug naar evenement
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Terug naar evenement
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
              {event.title}
            </h1>
            <span className="inline-flex items-center gap-1.5 bg-[#d42422]/15 text-[#ff6b69] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Trophy size={12} /> Bracket
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{STATUS_LABELS[bracket.status] ?? bracket.status}</span>
            <span>&middot;</span>
            <span>{bracket.participants.length} deelnemers</span>
            <span>&middot;</span>
            <span>{bracket.totalRounds} rondes</span>
            {bracket.status === 'IN_PROGRESS' && (
              <span className="flex items-center gap-1 text-red-400">
                <RefreshCw size={12} className="animate-spin" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Bracket */}
        <div className="bg-[#0a0f25] border border-white/10 rounded-2xl p-4 md:p-8 overflow-hidden">
          <BracketSVG bracket={bracket} mode="public" />
        </div>
      </div>
    </div>
  );
}
