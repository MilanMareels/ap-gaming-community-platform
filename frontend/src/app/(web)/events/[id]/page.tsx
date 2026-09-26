'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Gamepad2, Activity, Users, Trophy, Timer, Star, Loader, UserPlus, UserMinus, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { Event } from '@/api';
import type { components } from '@/api';
import { BracketSVG, type BracketData } from '@/components/bracket/BracketSVG';

type AuthProfile = components['schemas']['AuthProfileResponseDto'];

interface TimeTrialRun {
  id: number;
  timeMs: number;
  createdAt: string;
}

interface TimeTrialParticipant {
  id: number;
  name: string;
  bestTimeMs: number | null;
  runs: TimeTrialRun[];
}

interface TimeTrial {
  id: number;
  status: 'ACTIVE' | 'COMPLETED';
  participants: TimeTrialParticipant[];
}

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

const DIGIT_HEIGHT_PX = 44;

const CATEGORY_LABELS: Record<string, string> = {
  SINGLE_DAY: 'Evenement',
  MULTI_DAY: 'Meerdaags Evenement',
  TOURNAMENT_BRACKET: 'Bracket Toernooi',
  TOURNAMENT_TIMED: 'Time Trial Toernooi',
  TOURNAMENT_POINTS: 'Puntenklassement',
};

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  TOURNAMENT_BRACKET: Trophy,
  TOURNAMENT_TIMED: Timer,
  TOURNAMENT_POINTS: Star,
};

function isMultiDay(event: Event): boolean {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return start.toDateString() !== end.toDateString();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function isLive(startTime: string, endTime: string): boolean {
  const now = new Date();
  return now >= new Date(startTime) && now <= new Date(endTime);
}

function getCountdown(event: Event, nowMs: number) {
  const startMs = new Date(event.startTime).getTime();
  const endMs = new Date(event.endTime).getTime();
  const countingToEnd = nowMs >= startMs && nowMs <= endMs;
  const targetMs = countingToEnd ? endMs : startMs;
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    label: countingToEnd ? 'Ends in' : 'Starts in',
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function toDigits(value: number, minLength = 2): number[] {
  return String(value).padStart(minLength, '0').split('').map(Number);
}

function ScrollingDigit({ value }: { value: number }) {
  return (
    <div className="relative h-11 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/60 shadow-inner">
      <div
        className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${value * DIGIT_HEIGHT_PX}px)` }}
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <div key={digit} className="h-11 flex items-center justify-center text-xl font-black italic text-white tabular-nums tracking-tight">
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}

function DigitGroup({ value, label, minLength = 2 }: { value: number; label: string; minLength?: number }) {
  const digits = toDigits(value, minLength);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        {digits.map((digit, index) => (
          <ScrollingDigit key={`${label}-${index}`} value={digit} />
        ))}
      </div>
      <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold">{label}</p>
    </div>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [event, setEvent] = useState<(Event & { _count?: { registrations: number } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [timeTrial, setTimeTrial] = useState<TimeTrial | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [pointTrial, setPointTrial] = useState<PointTrial | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, profileRes] = await Promise.all([
          apiClient.GET('/events/{id}', { params: { path: { id } } }),
          apiClient.GET('/auth/profile', {}).catch(() => null),
        ]);
        if (eventRes.data) {
          const ev = eventRes.data as unknown as Event & { _count?: { registrations: number } };
          setEvent(ev);

          // Fetch tournament data based on category
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

        if (profileRes?.data) {
          setProfile(profileRes.data as AuthProfile);
        }
      } catch {
        // Profile fetch may fail if not logged in — that's fine
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Auto-refresh tournament data
  useEffect(() => {
    if (!event) return;
    const isActiveTT = event.category === 'TOURNAMENT_TIMED' && timeTrial?.status === 'ACTIVE';
    const isActiveBracket = event.category === 'TOURNAMENT_BRACKET' && bracket && bracket.status !== 'COMPLETED' && bracket.status !== 'DRAFT';
    const isActivePT = event.category === 'TOURNAMENT_POINTS' && pointTrial?.status === 'ACTIVE';
    if (!isActiveTT && !isActiveBracket && !isActivePT) return;

    const refresh = async () => {
      try {
        if (isActiveTT) {
          const ttRes = await apiClient.GET('/events/{eventId}/time-trial', {
            params: { path: { eventId: id } },
          });
          if (ttRes.data) setTimeTrial(ttRes.data as unknown as TimeTrial);
        } else if (isActiveBracket) {
          const brRes = await apiClient.GET('/events/{eventId}/bracket', {
            params: { path: { eventId: id } },
          });
          if (brRes.data) setBracket(brRes.data as unknown as BracketData);
        } else if (isActivePT) {
          const ptRes = await apiClient.GET('/events/{eventId}/point-trial', {
            params: { path: { eventId: id } },
          });
          if (ptRes.data) setPointTrial(ptRes.data as unknown as PointTrial);
        }
      } catch {
        // Silently handle
      }
    };
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.category, timeTrial?.status, bracket?.status, pointTrial?.status, id]);

  useEffect(() => {
    if (!profile || !event?.registrationEnabled) return;
    const checkRegistration = async () => {
      try {
        const res = await apiClient.GET('/events/{id}/registration-status', { params: { path: { id } } });
        if (res.data) {
          setIsRegistered((res.data as { registered: boolean }).registered);
        }
      } catch {
        // Not logged in or error
      }
    };
    checkRegistration();
  }, [profile, event?.registrationEnabled, id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await apiClient.POST('/events/{id}/register', { params: { path: { id } } });
      setIsRegistered(true);
      if (event?._count) {
        setEvent({ ...event, _count: { registrations: event._count.registrations + 1 } });
      }
    } catch (err) {
      console.error('Failed to register:', err);
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    setRegistering(true);
    try {
      await apiClient.DELETE('/events/{id}/register', { params: { path: { id } } });
      setIsRegistered(false);
      if (event?._count) {
        setEvent({ ...event, _count: { registrations: Math.max(0, event._count.registrations - 1) } });
      }
    } catch (err) {
      console.error('Failed to unregister:', err);
    } finally {
      setRegistering(false);
    }
  };

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

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-6">
        <p className="text-2xl font-bold">Evenement niet gevonden</p>
        <Link href="/events" className="text-[#d42422] hover:underline font-bold flex items-center gap-2">
          <ArrowLeft size={16} /> Terug naar evenementen
        </Link>
      </div>
    );
  }

  const countdown = getCountdown(event, nowMs);
  const live = isLive(event.startTime, event.endTime);
  const multiDay = isMultiDay(event);
  const categoryLabel = CATEGORY_LABELS[event.category] || event.category;
  const CategoryIcon = CATEGORY_ICONS[event.category];
  const registrationCount = event._count?.registrations ?? 0;

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className={`container mx-auto relative z-10 ${bracket ? 'max-w-7xl' : 'max-w-4xl'}`}>
        <ScrollReveal direction="up">
          <Link href="/events" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-bold text-sm uppercase tracking-wider">
            <ArrowLeft size={16} /> Terug naar evenementen
          </Link>
        </ScrollReveal>

        <ScrollReveal direction="up">
          <div className={`relative bg-[#0a0f25] border-2 rounded-[2rem] overflow-hidden ${live ? 'border-[#d42422] shadow-[0_0_50px_rgba(212,36,34,0.15)]' : 'border-white/10'}`}>
            {live && (
              <div className="absolute top-6 right-6 flex items-center gap-2 bg-[#d42422] text-white px-4 py-1.5 rounded-full font-bold tracking-widest text-sm uppercase z-30 animate-pulse">
                <Activity size={16} /> LIVE NOW
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-tr from-[#020618] via-[#0a0f25] to-transparent z-10 opacity-90"></div>

            <div className="relative z-20 p-8 md:p-16">
              {/* Category & badges */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-[#d42422]/15 text-[#ff6b69] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {CategoryIcon && <CategoryIcon size={12} />}
                  {categoryLabel}
                </span>
                {event.type && (
                  <span className="inline-flex items-center gap-1.5 bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Gamepad2 size={12} /> {event.type}
                  </span>
                )}
                {event.registrationEnabled && (
                  <span className="inline-flex items-center gap-1.5 bg-green-500/15 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Users size={12} /> {registrationCount} ingeschreven
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter text-white uppercase drop-shadow-xl mb-6 leading-none">
                {event.title}
              </h1>

              {/* Description */}
              {event.description && (
                <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-3xl">
                  {event.description}
                </p>
              )}

              {/* Countdown */}
              <div className="mb-8 w-fit max-w-full md:min-w-[34rem] rounded-3xl border border-[#d42422]/30 bg-[#d42422]/10 p-3.5 md:p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                  <p className="text-[#ff6b69] uppercase tracking-[0.18em] font-bold text-[10px] md:text-xs">Countdown</p>
                  <p className="text-white/90 uppercase tracking-[0.14em] font-bold text-[10px]">{countdown.label}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 md:gap-x-5 md:gap-y-2">
                  <DigitGroup value={countdown.days} label="Days" minLength={2} />
                  <DigitGroup value={countdown.hours} label="Hours" minLength={2} />
                  <DigitGroup value={countdown.minutes} label="Minutes" minLength={2} />
                  <DigitGroup value={countdown.seconds} label="Seconds" minLength={2} />
                </div>
              </div>

              {/* Date & Time info */}
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                  <CalendarDays className="text-[#d42422]" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Datum</p>
                    <p className="text-lg font-bold text-white">
                      {multiDay ? formatDateRange(event.startTime, event.endTime) : formatFullDate(event.startTime)}
                    </p>
                  </div>
                </div>
                <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                  <Clock className="text-[#d42422]" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tijd</p>
                    <p className="text-lg font-bold text-white">
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Registration */}
              {event.registrationEnabled && (
                <div className="border-t border-white/10 pt-8">
                  {profile ? (
                    <div className="flex flex-col items-center gap-4">
                      {isRegistered ? (
                        <>
                          <p className="text-green-400 font-bold text-sm uppercase tracking-wider">Je bent ingeschreven voor dit evenement</p>
                          <Button variant="danger" size="lg" className="px-12 py-5 text-lg" onClick={handleUnregister} disabled={registering}>
                            <UserMinus size={22} />
                            {registering ? 'Bezig...' : 'Uitschrijven'}
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" size="lg" className="px-12 py-5 text-lg" onClick={handleRegister} disabled={registering}>
                          <UserPlus size={22} />
                          {registering ? 'Bezig...' : 'Inschrijven'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-gray-400 text-center">
                        <Link href="/login" className="text-[#d42422] hover:underline font-bold">Log in</Link> om je in te schrijven voor dit evenement.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Embedded Time Trial Leaderboard */}
        {event.category === 'TOURNAMENT_TIMED' && timeTrial && (
          <ScrollReveal direction="up">
            <div className="mt-8 bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Timer className="text-[#d42422]" size={20} />
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">
                    Time Trial Leaderboard
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{timeTrial.participants.length} deelnemers</span>
                  {timeTrial.status === 'ACTIVE' && (
                    <span className="flex items-center gap-1 text-red-400">
                      <RefreshCw size={12} className="animate-spin" />
                      Live
                    </span>
                  )}
                </div>
              </div>

              {(() => {
                const withBest = timeTrial.participants.filter((p) => p.bestTimeMs !== null);
                const withoutBest = timeTrial.participants.filter((p) => p.bestTimeMs === null);

                if (timeTrial.participants.length === 0) {
                  return (
                    <div className="px-6 py-8 text-center text-gray-500 italic">
                      Nog geen deelnemers.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-gray-500 uppercase text-xs">
                        <th className="px-6 py-4 font-bold w-16">#</th>
                        <th className="px-6 py-4 font-bold">Naam</th>
                        <th className="px-6 py-4 font-bold w-20 text-center">Runs</th>
                        <th className="px-6 py-4 font-bold text-right">Beste tijd</th>
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
                              <td className="px-6 py-4 text-center text-gray-400">{participant.runs.length}</td>
                              <td className={`px-6 py-4 text-right font-mono font-bold text-base ${isTop3 ? 'text-white' : 'text-gray-300'}`}>
                                {formatTimeMs(participant.bestTimeMs!)}
                              </td>
                              <td className="px-6 py-4">
                                {participant.runs.length > 1 && (isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />)}
                              </td>
                            </tr>
                            {isExpanded && participant.runs.length > 1 && (
                              <tr className="border-b border-white/5">
                                <td colSpan={5} className="px-6 py-0">
                                  <div className="py-3 pl-8 border-l-2 border-white/10 ml-2">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Alle runs</p>
                                    <div className="space-y-1">
                                      {participant.runs.map((run, runIdx) => (
                                        <div key={run.id} className="flex items-center gap-4 text-sm">
                                          <span className="text-gray-600 text-xs w-6">{runIdx + 1}.</span>
                                          <span className={`font-mono ${runIdx === 0 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                            {formatTimeMs(run.timeMs)}
                                          </span>
                                          {runIdx === 0 && (
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
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </ScrollReveal>
        )}

        {/* Embedded Bracket */}
        {event.category === 'TOURNAMENT_BRACKET' && bracket && (
          <ScrollReveal direction="up">
            <div className="mt-8 bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Trophy className="text-[#d42422]" size={20} />
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">
                    Bracket
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
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
              <div className="p-4 md:p-8">
                <BracketSVG bracket={bracket} mode="public" />
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Embedded Point Trial Leaderboard */}
        {event.category === 'TOURNAMENT_POINTS' && pointTrial && (
          <ScrollReveal direction="up">
            <div className="mt-8 bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Star className="text-[#d42422]" size={20} />
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">
                    Puntenklassement
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{pointTrial.participants.length} deelnemers</span>
                  {pointTrial.status === 'ACTIVE' && (
                    <span className="flex items-center gap-1 text-red-400">
                      <RefreshCw size={12} className="animate-spin" />
                      Live
                    </span>
                  )}
                </div>
              </div>

              {(() => {
                const withBestPt = pointTrial.participants.filter((p) => p.bestPoints !== null);
                const withoutBestPt = pointTrial.participants.filter((p) => p.bestPoints === null);

                if (pointTrial.participants.length === 0) {
                  return (
                    <div className="px-6 py-8 text-center text-gray-500 italic">
                      Nog geen deelnemers.
                    </div>
                  );
                }

                return (
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
                      {withBestPt.map((participant, idx) => {
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
                      {withoutBestPt.map((participant) => (
                        <tr key={participant.id} className="border-b border-white/5">
                          <td className="px-6 py-4 font-bold text-gray-600">-</td>
                          <td className="px-6 py-4 font-medium text-gray-500">{participant.name}</td>
                          <td className="px-6 py-4 text-center text-gray-600">0</td>
                          <td className="px-6 py-4 text-right font-mono text-gray-600">-</td>
                          <td className="px-6 py-4"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
