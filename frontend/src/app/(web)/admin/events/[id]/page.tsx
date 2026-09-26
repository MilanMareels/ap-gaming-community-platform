'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Gamepad2, Users, Trophy, Timer, Star, Loader2 } from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';
import { BracketSVG, type BracketData } from '@/components/bracket/BracketSVG';

const CATEGORY_LABELS: Record<string, string> = {
  SINGLE_DAY: 'Evenement (één dag)',
  MULTI_DAY: 'Meerdaags evenement',
  TOURNAMENT_BRACKET: 'Bracket Toernooi',
  TOURNAMENT_TIMED: 'Time Trial Toernooi',
  TOURNAMENT_POINTS: 'Puntenklassement',
};

type EventWithCount = Event & { _count?: { registrations: number } };

interface Registration {
  id: number;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    sNumber: string;
  };
}

interface TimeTrialParticipant {
  id: number;
  name: string;
  bestTimeMs: number | null;
  runs: { id: number }[];
}

interface TimeTrial {
  id: number;
  status: 'ACTIVE' | 'COMPLETED';
  participants: TimeTrialParticipant[];
}

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

function formatTimeMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeTrial, setTimeTrial] = useState<TimeTrial | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [pointTrial, setPointTrial] = useState<PointTrial | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [eventRes, regRes] = await Promise.all([
          apiClient.GET('/events/{id}', { params: { path: { id } } }),
          apiClient.GET('/events/{id}/registrations', { params: { path: { id } } }),
        ]);
        if (eventRes.data) {
          const ev = eventRes.data as unknown as EventWithCount;
          setEvent(ev);

          if (ev.category === 'TOURNAMENT_TIMED') {
            const ttRes = await apiClient.GET('/events/{eventId}/time-trial', {
              params: { path: { eventId: id } },
            }).catch(() => null);
            if (ttRes?.data) setTimeTrial(ttRes.data as unknown as TimeTrial);
          } else if (ev.category === 'TOURNAMENT_BRACKET') {
            const brRes = await apiClient.GET('/events/{eventId}/bracket', {
              params: { path: { eventId: id } },
            }).catch(() => null);
            if (brRes?.data) setBracket(brRes.data as unknown as BracketData);
          } else if (ev.category === 'TOURNAMENT_POINTS') {
            const ptRes = await apiClient.GET('/events/{eventId}/point-trial', {
              params: { path: { eventId: id } },
            }).catch(() => null);
            if (ptRes?.data) setPointTrial(ptRes.data as unknown as PointTrial);
          }
        }
        if (regRes.data) setRegistrations(regRes.data as unknown as Registration[]);
      } catch (err) {
        console.error('Failed to fetch event details:', err);
      } finally {
        setLoading(false);
      }
    };
    load().catch(console.error);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Event niet gevonden.</p>
        <Link href="/admin/events" className="text-red-500 hover:underline font-bold">
          <ArrowLeft size={14} className="inline mr-1" /> Terug naar events
        </Link>
      </div>
    );
  }

  const isMultiDay = new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString();

  return (
    <div>
      <Link href="/admin/events" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 font-bold text-sm">
        <ArrowLeft size={14} /> Terug naar events
      </Link>

      {/* Event details card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-2xl font-black">{event.title}</h2>
          <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase">
            {CATEGORY_LABELS[event.category] ?? event.category}
          </span>
          {event.type && (
            <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
              <Gamepad2 size={10} /> {event.type}
            </span>
          )}
          {event.registrationEnabled && (
            <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
              <Users size={10} /> Inschrijving open
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-gray-400 text-sm mb-4">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-red-500" />
            {isMultiDay
              ? `${formatDateShort(event.startTime)} - ${formatDateShort(event.endTime)}`
              : formatDate(event.startTime)}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-red-500" />
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </div>
          {event.registrationEnabled && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-red-500" />
              {event._count?.registrations ?? 0} ingeschreven
            </div>
          )}
        </div>

      </div>

      {/* Embedded Time Trial Leaderboard */}
      {event.category === 'TOURNAMENT_TIMED' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="font-bold flex items-center gap-2">
              <Timer size={16} className="text-red-500" />
              Time Trial Leaderboard
              {timeTrial && (
                <span className="text-xs text-gray-500 font-normal ml-1">
                  ({timeTrial.participants.length} deelnemers)
                </span>
              )}
            </h3>
            <Link
              href={`/admin/events/${id}/time-trial`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              <Timer size={12} /> Beheren
            </Link>
          </div>

          {!timeTrial ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen time trial aangemaakt.
            </div>
          ) : timeTrial.participants.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen deelnemers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 font-bold w-12">#</th>
                    <th className="px-4 py-3 font-bold">Naam</th>
                    <th className="px-4 py-3 font-bold w-16 text-center">Runs</th>
                    <th className="px-4 py-3 font-bold text-right">Beste tijd</th>
                  </tr>
                </thead>
                <tbody>
                  {timeTrial.participants
                    .filter((p) => p.bestTimeMs !== null)
                    .map((participant, idx) => {
                      const rank = idx + 1;
                      const rankColor = RANK_COLORS[rank] ?? 'text-gray-500';
                      return (
                        <tr key={participant.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className={`px-4 py-3 font-black ${rankColor}`}>{rank}</td>
                          <td className="px-4 py-3 font-medium">{participant.name}</td>
                          <td className="px-4 py-3 text-center text-gray-400">{participant.runs.length}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{formatTimeMs(participant.bestTimeMs!)}</td>
                        </tr>
                      );
                    })}
                  {timeTrial.participants
                    .filter((p) => p.bestTimeMs === null)
                    .map((participant) => (
                      <tr key={participant.id} className="border-b border-slate-800/50">
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-500">{participant.name}</td>
                        <td className="px-4 py-3 text-center text-gray-600">0</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">-</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Embedded Bracket */}
      {event.category === 'TOURNAMENT_BRACKET' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="font-bold flex items-center gap-2">
              <Trophy size={16} className="text-red-500" />
              Bracket
              {bracket && (
                <span className="text-xs text-gray-500 font-normal ml-1">
                  ({bracket.participants.length} deelnemers &middot; {bracket.totalRounds} rondes)
                </span>
              )}
            </h3>
            <Link
              href={`/admin/events/${id}/bracket`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              <Trophy size={12} /> Beheren
            </Link>
          </div>

          {!bracket ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen bracket aangemaakt.
            </div>
          ) : (
            <div className="p-4">
              <BracketSVG bracket={bracket} mode="public" />
            </div>
          )}
        </div>
      )}

      {/* Embedded Point Trial Leaderboard */}
      {event.category === 'TOURNAMENT_POINTS' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="font-bold flex items-center gap-2">
              <Star size={16} className="text-red-500" />
              Puntenklassement
              {pointTrial && (
                <span className="text-xs text-gray-500 font-normal ml-1">
                  ({pointTrial.participants.length} deelnemers)
                </span>
              )}
            </h3>
            <Link
              href={`/admin/events/${id}/point-trial`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              <Star size={12} /> Beheren
            </Link>
          </div>

          {!pointTrial ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen puntenklassement aangemaakt.
            </div>
          ) : pointTrial.participants.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen deelnemers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 font-bold w-12">#</th>
                    <th className="px-4 py-3 font-bold">Naam</th>
                    <th className="px-4 py-3 font-bold w-16 text-center">Pogingen</th>
                    <th className="px-4 py-3 font-bold text-right">Beste score</th>
                  </tr>
                </thead>
                <tbody>
                  {pointTrial.participants
                    .filter((p) => p.bestPoints !== null)
                    .map((participant, idx) => {
                      const rank = idx + 1;
                      const rankColor = RANK_COLORS[rank] ?? 'text-gray-500';
                      return (
                        <tr key={participant.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className={`px-4 py-3 font-black ${rankColor}`}>{rank}</td>
                          <td className="px-4 py-3 font-medium">{participant.name}</td>
                          <td className="px-4 py-3 text-center text-gray-400">{participant.entries.length}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{formatPoints(participant.bestPoints!)} pts</td>
                        </tr>
                      );
                    })}
                  {pointTrial.participants
                    .filter((p) => p.bestPoints === null)
                    .map((participant) => (
                      <tr key={participant.id} className="border-b border-slate-800/50">
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-500">{participant.name}</td>
                        <td className="px-4 py-3 text-center text-gray-600">0</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">-</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Registrations table */}
      {event.registrationEnabled && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={16} className="text-red-500" />
              Inschrijvingen ({registrations.length})
            </h3>
          </div>

          {registrations.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8">
              Nog geen inschrijvingen.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 font-bold">#</th>
                    <th className="px-4 py-3 font-bold">Naam</th>
                    <th className="px-4 py-3 font-bold">E-mail</th>
                    <th className="px-4 py-3 font-bold">S-nummer</th>
                    <th className="px-4 py-3 font-bold">Ingeschreven op</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => (
                    <tr key={reg.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{reg.user.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{reg.user.email}</td>
                      <td className="px-4 py-3 text-gray-400">{reg.user.sNumber}</td>
                      <td className="px-4 py-3 text-gray-400">{formatDateTime(reg.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
