'use client';

import { useState, useEffect, use } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';
import { BracketSVG, type BracketData } from '@/components/bracket/BracketSVG';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Concept',
  GENERATED: 'Klaar om te beginnen',
  IN_PROGRESS: 'LIVE',
  COMPLETED: 'Afgelopen',
};

export default function KioskBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

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

  if (!event || !bracket) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-[clamp(1rem,2vh,2rem)] font-bold text-gray-400">
          Bracket niet gevonden
        </p>
      </div>
    );
  }

  const isLive = bracket.status === 'IN_PROGRESS';

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-[clamp(1rem,2vw,3rem)] py-[clamp(0.5rem,1vh,1.5rem)] border-b border-slate-800">
        <div className="flex items-center gap-[clamp(0.5rem,1vw,1.5rem)]">
          <Trophy
            className="text-red-500"
            size={24}
          />
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
            {STATUS_LABELS[bracket.status]}
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

      {/* Bracket - fill remaining space, centered */}
      <div className="flex-1 overflow-auto p-[clamp(0.5rem,1vw,2rem)] flex items-center justify-center">
        <BracketSVG bracket={bracket} mode="kiosk" />
      </div>
    </div>
  );
}
