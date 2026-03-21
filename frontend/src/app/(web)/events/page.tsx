'use client';

import { useState, useEffect } from 'react';
import { Clock, Gamepad2, CalendarDays, Terminal, Activity } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { Event } from '@/api';

const DIGIT_HEIGHT_PX = 44;

function formatDateParts(dateStr: string): [string, string, string] {
  const d = new Date(dateStr);
  return [
    d.toLocaleDateString('nl-NL', { day: 'numeric' }),
    d.toLocaleDateString('nl-NL', { month: 'short' }),
    d.toLocaleDateString('nl-NL', { year: 'numeric' }),
  ];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isLive(startTime: string, endTime: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return now >= start && now <= end;
}

function getCountdown(event: Event, nowMs: number) {
  const startMs = new Date(event.startTime).getTime();
  const endMs = new Date(event.endTime).getTime();

  const countingToEnd = nowMs >= startMs && nowMs <= endMs;
  const targetMs = countingToEnd ? endMs : startMs;
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    label: countingToEnd ? 'Ends in' : 'Starts in',
    days,
    hours,
    minutes,
    seconds,
  };
}

function toDigits(value: number, minLength = 2): number[] {
  return String(value)
    .padStart(minLength, '0')
    .split('')
    .map((digit) => Number(digit));
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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.GET('/events');
      if (res.data) {
        setEvents(res.data as unknown as Event[]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-4">
          <Activity className="text-[#d42422] animate-bounce" size={32} />
          <span className="text-xl font-black italic tracking-widest">LOADING SATELLITE...</span>
        </div>
      </div>
    );
  }

  const upcomingEvents = events
    .filter((e) => new Date(e.endTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const heroEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const otherEvents = upcomingEvents.length > 1 ? upcomingEvents.slice(1) : [];
  const heroCountdown = heroEvent ? getCountdown(heroEvent, nowMs) : null;

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-16">
            <h1 className="text-4xl md:text-8xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
              <Terminal size={64} className="text-[#d42422]" />
              Operations
            </h1>
            <p className="text-[#d42422] tracking-[0.3em] font-bold text-sm mt-2 uppercase">// Active Operational Directives</p>
          </div>
        </ScrollReveal>

        {events.length === 0 ? (
          <div className="text-center text-gray-400 py-32 border border-white/5 bg-[#0a0f25]/50 backdrop-blur-sm rounded-[2rem]">
            <Terminal size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl tracking-widest uppercase">No operations scheduled.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* HER0 EVENT */}
            {heroEvent && (
              <ScrollReveal direction="up">
                <div
                  className={`relative bg-[#0a0f25] border-2 rounded-[2rem] overflow-hidden group ${isLive(heroEvent.startTime, heroEvent.endTime) ? 'border-[#d42422] shadow-[0_0_50px_rgba(212,36,34,0.15)]' : 'border-white/10 hover:border-white/30'} transition-all duration-500`}
                >
                  {isLive(heroEvent.startTime, heroEvent.endTime) && (
                    <div className="absolute top-6 right-6 flex items-center gap-2 bg-[#d42422] text-white px-4 py-1.5 rounded-full font-bold tracking-widest text-sm uppercase z-30 animate-pulse">
                      <Activity size={16} /> LIVE NOW
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-tr from-[#020618] via-[#0a0f25] to-transparent z-10 opacity-90"></div>

                  <div className="relative z-20 p-8 md:p-16 flex flex-col md:flex-row items-center md:items-end justify-between gap-8 h-full">
                    <div className="flex-1">
                      <p className="text-[#d42422] uppercase tracking-[0.2em] font-bold text-sm mb-4">Featured Event</p>
                      <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter text-white uppercase drop-shadow-xl mb-6 leading-none">
                        {heroEvent.title}
                      </h2>

                      {heroCountdown && (
                        <div className="mb-8 w-fit max-w-full md:min-w-[34rem] rounded-3xl border border-[#d42422]/30 bg-[#d42422]/10 p-3.5 md:p-4 backdrop-blur-md">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                            <p className="text-[#ff6b69] uppercase tracking-[0.18em] font-bold text-[10px] md:text-xs">Mission Countdown</p>
                            <p className="text-white/90 uppercase tracking-[0.14em] font-bold text-[10px]">{heroCountdown.label}</p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 md:gap-x-5 md:gap-y-2">
                            <DigitGroup value={heroCountdown.days} label="Days" minLength={2} />
                            <DigitGroup value={heroCountdown.hours} label="Hours" minLength={2} />
                            <DigitGroup value={heroCountdown.minutes} label="Minutes" minLength={2} />
                            <DigitGroup value={heroCountdown.seconds} label="Seconds" minLength={2} />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4">
                        <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                          <CalendarDays className="text-[#d42422]" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Date</p>
                            <p className="text-lg font-bold text-white">
                              {new Date(heroEvent.startTime).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        </div>
                        <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                          <Clock className="text-[#d42422]" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Time</p>
                            <p className="text-lg font-bold text-white">
                              {formatTime(heroEvent.startTime)} - {formatTime(heroEvent.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-[#d42422]/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-[#d42422]/30 flex items-center gap-3">
                          <Gamepad2 className="text-[#d42422]" />
                          <div>
                            <p className="text-xs text-[#d42422]/80 uppercase font-bold tracking-wider">Type</p>
                            <p className="text-lg font-bold text-[#d42422]">{heroEvent.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* UPCOMING GRID */}
            {otherEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {otherEvents.map((event, idx) => {
                  const [day, month] = formatDateParts(event.startTime);
                  return (
                    <ScrollReveal key={event.id} direction="up" delay={idx * 100}>
                      <div className="bg-[#0a0f25] border border-white/10 p-8 rounded-[2rem] hover:border-[#d42422]/50 hover:-translate-y-1 transition-all group flex items-start gap-6 relative overflow-hidden h-full">
                        <div className="flex flex-col items-center justify-center bg-black/40 rounded-2xl w-24 h-24 border border-white/5 shadow-inner">
                          <span className="text-3xl font-black italic tracking-tighter text-white">{day}</span>
                          <span className="text-xs uppercase tracking-widest text-[#d42422] font-bold">{month}</span>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-2xl font-black italic tracking-tight text-white uppercase mb-2 group-hover:text-[#d42422] transition-colors">
                            {event.title}
                          </h3>
                          <div className="flex flex-col gap-2 mt-4">
                            <p className="text-sm text-gray-400 flex items-center gap-2 font-medium">
                              <Clock size={14} className="text-[#d42422]" /> {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                            <p className="text-sm text-gray-400 flex items-center gap-2 font-medium">
                              <Gamepad2 size={14} className="text-[#d42422]" /> {event.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
