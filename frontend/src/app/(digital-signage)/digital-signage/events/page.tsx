'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, CalendarDays, Clock, Gamepad2, Trophy, Timer, Star, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/api';
import type { Event } from '@/api';

const ROTATION_INTERVAL_MS = 8000;
const TRANSITION_DURATION_MS = 800;

const DIGIT_HEIGHT_PX = 44;

const CATEGORY_LABELS: Record<string, string> = {
  SINGLE_DAY: 'Evenement',
  MULTI_DAY: 'Meerdaags',
  TOURNAMENT_BRACKET: 'Toernooi',
  TOURNAMENT_TIMED: 'Time Trial',
  TOURNAMENT_POINTS: 'Punten',
};

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  TOURNAMENT_BRACKET: Trophy,
  TOURNAMENT_TIMED: Timer,
  TOURNAMENT_POINTS: Star,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`;
}

function isMultiDay(event: Event): boolean {
  return new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString();
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
    label: countingToEnd ? 'Eindigt over' : 'Start over',
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
      <p className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-bold">{label}</p>
    </div>
  );
}

function EventCard({
  event,
  nowMs,
  position,
}: {
  event: Event & { _count?: { registrations: number } };
  nowMs: number;
  position: 'center' | 'above' | 'below' | 'far-above' | 'far-below' | 'hidden';
}) {
  const live = isLive(event.startTime, event.endTime);
  const countdown = getCountdown(event, nowMs);
  const multiDay = isMultiDay(event);
  const categoryLabel = CATEGORY_LABELS[event.category] || event.category;
  const CategoryIcon = CATEGORY_ICONS[event.category];
  const registrationCount = event._count?.registrations ?? 0;

  const positionConfig: Record<typeof position, { y: string; scale: number; opacity: number; z: number; blur: number }> = {
    'center': { y: '0%', scale: 1, opacity: 1, z: 30, blur: 0 },
    'above': { y: '-52%', scale: 0.75, opacity: 0.6, z: 20, blur: 6 },
    'below': { y: '52%', scale: 0.75, opacity: 0.6, z: 20, blur: 6 },
    'far-above': { y: '-90%', scale: 0.55, opacity: 0, z: 10, blur: 12 },
    'far-below': { y: '90%', scale: 0.55, opacity: 0, z: 10, blur: 12 },
    'hidden': { y: '120%', scale: 0.4, opacity: 0, z: 0, blur: 16 },
  };

  const config = positionConfig[position];

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        top: '50%',
        transform: `translateY(calc(-50% + ${config.y})) scale(${config.scale})`,
        opacity: config.opacity,
        filter: config.blur > 0 ? `blur(${config.blur}px)` : 'none',
        zIndex: config.z,
        transitionProperty: 'transform, opacity, filter',
        transitionDuration: `${TRANSITION_DURATION_MS}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div className={`w-[85vw] max-w-[1400px] relative rounded-[2rem] overflow-hidden ${live ? 'border-2 border-[#d42422] shadow-[0_0_60px_rgba(212,36,34,0.2)]' : 'border-2 border-white/15'}`}>
        {/* Solid card background */}
        <div className="absolute inset-0 bg-[#0f1631] z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent z-[1]" />

        {live && (
          <div className="relative z-30 float-right m-8 flex items-center gap-2 bg-[#d42422] text-white px-5 py-2 rounded-full font-bold tracking-widest text-base uppercase animate-pulse">
            <Activity size={18} /> LIVE NOW
          </div>
        )}

        <div className="relative z-20 p-10 md:p-16 flex items-stretch gap-10">
          {/* Left: event info */}
          <div className="flex-1 min-w-0">
            {/* Category & badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 bg-[#d42422]/15 text-[#ff6b69] px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                {CategoryIcon && <CategoryIcon size={14} />}
                {categoryLabel}
              </span>
              {event.type && (
                <span className="inline-flex items-center gap-2 bg-white/5 text-gray-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                  <Gamepad2 size={14} /> {event.type}
                </span>
              )}
              {event.registrationEnabled && (
                <span className="inline-flex items-center gap-1.5 bg-green-500/15 text-green-400 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                  <Users size={14} /> {registrationCount} ingeschreven
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-[clamp(2.5rem,5vw,6rem)] font-black italic tracking-tighter text-white uppercase leading-none mb-8">
              {event.title}
            </h2>

            {/* Countdown */}
            <div className="mb-8 w-fit rounded-3xl border border-[#d42422]/30 bg-[#d42422]/10 p-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                <p className="text-[#ff6b69] uppercase tracking-[0.18em] font-bold text-xs">Countdown</p>
                <p className="text-white/90 uppercase tracking-[0.14em] font-bold text-[10px]">{countdown.label}</p>
              </div>
              <div className="flex items-center gap-5">
                <DigitGroup value={countdown.days} label="Dagen" minLength={2} />
                <span className="text-2xl font-black text-white/20 -mt-5">:</span>
                <DigitGroup value={countdown.hours} label="Uren" minLength={2} />
                <span className="text-2xl font-black text-white/20 -mt-5">:</span>
                <DigitGroup value={countdown.minutes} label="Min" minLength={2} />
                <span className="text-2xl font-black text-white/20 -mt-5">:</span>
                <DigitGroup value={countdown.seconds} label="Sec" minLength={2} />
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                <CalendarDays className="text-[#d42422]" size={22} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Datum</p>
                  <p className="text-lg font-bold text-white">
                    {multiDay ? formatDateRange(event.startTime, event.endTime) : formatFullDate(event.startTime)}
                  </p>
                </div>
              </div>
              <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3">
                <Clock className="text-[#d42422]" size={22} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tijd</p>
                  <p className="text-lg font-bold text-white">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: QR code */}
          <div className="hidden md:flex flex-col items-center justify-center gap-4 shrink-0">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`}
                size={160}
                bgColor="#ffffff"
                fgColor="#0f1631"
                level="M"
              />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold text-center">Scan voor details</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DigitalSignageEventsPage() {
  const [events, setEvents] = useState<(Event & { _count?: { registrations: number } })[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiClient.GET('/events');
      if (res.data) {
        const upcoming = (res.data as unknown as Event[])
          .filter((e) => new Date(e.endTime) >= new Date())
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setEvents(upcoming as (Event & { _count?: { registrations: number } })[]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 300000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [events.length]);

  function getPosition(index: number): 'center' | 'above' | 'below' | 'far-above' | 'far-below' | 'hidden' {
    const total = events.length;
    if (total === 0) return 'hidden';

    // Calculate the shortest circular distance
    let diff = index - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    switch (diff) {
      case 0: return 'center';
      case -1: return 'above';
      case 1: return 'below';
      case -2: return 'far-above';
      case 2: return 'far-below';
      default: return 'hidden';
    }
  }

  if (events.length === 0) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <CalendarDays size={64} className="text-gray-600 mb-6" />
        <p className="text-3xl font-black italic tracking-widest uppercase text-gray-500">Geen aankomende evenementen</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute -top-[300px] -right-[300px] w-[700px] h-[700px] bg-[#d42422]/8 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] bg-[#d42422]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Top / bottom gradient fades for the 3D depth feel */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 to-transparent z-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-40 pointer-events-none" />

      {/* Carousel container */}
      <div className="relative h-full w-full" style={{ perspective: '1200px' }}>
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            nowMs={nowMs}
            position={getPosition(index)}
          />
        ))}
      </div>

      {/* Progress dots */}
      {events.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
          {events.map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-500 ${
                index === activeIndex
                  ? 'w-10 h-3 bg-[#d42422]'
                  : 'w-3 h-3 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
