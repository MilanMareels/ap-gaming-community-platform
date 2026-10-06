'use client';

import { useState, useEffect, use } from 'react';
import { Activity, CalendarDays, Clock, Gamepad2, Users, Trophy, Timer, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/api';
import type { Event } from '@/api';

const DIGIT_HEIGHT_PX = 64;

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

function isMultiDay(event: Event): boolean {
  return new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString();
}

function isLive(startTime: string, endTime: string): boolean {
  const now = new Date();
  return now >= new Date(startTime) && now <= new Date(endTime);
}

function isEnded(endTime: string): boolean {
  return new Date() > new Date(endTime);
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-black/60 shadow-inner" style={{ height: DIGIT_HEIGHT_PX, width: DIGIT_HEIGHT_PX * 0.7 }}>
      <div
        className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${value * DIGIT_HEIGHT_PX}px)` }}
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <div key={digit} className="flex items-center justify-center font-black italic text-white tabular-nums tracking-tight" style={{ height: DIGIT_HEIGHT_PX, fontSize: DIGIT_HEIGHT_PX * 0.55 }}>
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}

function CountdownUnit({ value, label, minLength = 2 }: { value: number; label: string; minLength?: number }) {
  const digits = toDigits(value, minLength);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {digits.map((digit, index) => (
          <ScrollingDigit key={`${label}-${index}`} value={digit} />
        ))}
      </div>
      <p className="text-sm uppercase tracking-[0.3em] text-gray-400 font-bold">{label}</p>
    </div>
  );
}

export default function DigitalSignageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<(Event & { _count?: { registrations: number } }) | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.GET('/events/{id}', { params: { path: { id } } });
        if (res.data) setEvent(res.data as unknown as Event & { _count?: { registrations: number } });
      } catch (err) {
        console.error('Failed to fetch event:', err);
      }
    };
    fetchEvent();
    const interval = setInterval(fetchEvent, 60000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!event) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-white text-3xl font-black italic tracking-widest">LADEN...</div>
      </div>
    );
  }

  const live = isLive(event.startTime, event.endTime);
  const ended = isEnded(event.endTime);
  const countdown = getCountdown(event, nowMs);
  const multiDay = isMultiDay(event);
  const categoryLabel = CATEGORY_LABELS[event.category] || event.category;
  const CategoryIcon = CATEGORY_ICONS[event.category];
  const registrationCount = event._count?.registrations ?? 0;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden flex">
      {/* Left panel — event info */}
      <div className="flex-1 flex flex-col justify-center p-16 relative overflow-hidden">
        {/* Red accent line */}
        <div className="absolute top-0 left-0 w-2 h-full bg-[#d42422]" />

        {/* Background glow */}
        <div className="absolute -top-[200px] -left-[200px] w-[500px] h-[500px] bg-[#d42422]/8 blur-[150px] rounded-full pointer-events-none" />

        {/* Status badge */}
        <div className="mb-8">
          {live ? (
            <div className="inline-flex items-center gap-3 bg-[#d42422] text-white px-6 py-2.5 rounded-full font-bold tracking-widest text-lg uppercase animate-pulse">
              <Activity size={22} /> LIVE NOW
            </div>
          ) : ended ? (
            <div className="inline-flex items-center gap-3 bg-white/10 text-gray-400 px-6 py-2.5 rounded-full font-bold tracking-widest text-lg uppercase">
              Afgelopen
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 bg-white/5 text-gray-300 px-6 py-2.5 rounded-full font-bold tracking-widest text-lg uppercase border border-white/10">
              Binnenkort
            </div>
          )}
        </div>

        {/* Category */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-2 bg-[#d42422]/15 text-[#ff6b69] px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
            {CategoryIcon && <CategoryIcon size={16} />}
            {categoryLabel}
          </span>
          {event.type && (
            <span className="inline-flex items-center gap-2 bg-white/5 text-gray-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
              <Gamepad2 size={14} /> {event.type}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-[clamp(3rem,6vw,7rem)] font-black italic tracking-tighter text-white uppercase leading-[0.9] mb-10">
          {event.title}
        </h1>

        {/* Description */}
        {event.description && (
          <p className="text-gray-400 text-xl leading-relaxed mb-10 max-w-[600px]">
            {event.description}
          </p>
        )}

        {/* Countdown — single row */}
        {!ended ? (
          <div className="mb-10 rounded-3xl border border-[#d42422]/30 bg-[#d42422]/10 p-6 backdrop-blur-md w-fit">
            <p className="text-[#ff6b69] uppercase tracking-[0.25em] font-bold text-xs mb-5">
              {countdown.label}
            </p>
            <div className="flex items-center gap-5">
              <CountdownUnit value={countdown.days} label="Dagen" minLength={2} />
              <span className="text-4xl font-black text-white/20 -mt-8">:</span>
              <CountdownUnit value={countdown.hours} label="Uren" minLength={2} />
              <span className="text-4xl font-black text-white/20 -mt-8">:</span>
              <CountdownUnit value={countdown.minutes} label="Minuten" minLength={2} />
              <span className="text-4xl font-black text-white/20 -mt-8">:</span>
              <CountdownUnit value={countdown.seconds} label="Seconden" minLength={2} />
            </div>
          </div>
        ) : (
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 px-8 py-6">
            <p className="text-gray-500 uppercase tracking-[0.3em] font-bold text-xl">Afgelopen</p>
          </div>
        )}

        {/* Info grid */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <CalendarDays className="text-[#d42422]" size={24} />
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Datum</p>
              <p className="text-lg font-bold text-white">
                {multiDay ? formatDateRange(event.startTime, event.endTime) : formatFullDate(event.startTime)}
              </p>
            </div>
          </div>
          <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <Clock className="text-[#d42422]" size={24} />
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tijd</p>
              <p className="text-lg font-bold text-white">
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </p>
            </div>
          </div>
          {event.registrationEnabled && (
            <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4">
              <Users className="text-green-400" size={24} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ingeschreven</p>
                <p className="text-lg font-bold text-green-400">{registrationCount} deelnemers</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — QR code */}
      <div className="w-[320px] shrink-0 bg-[#0a0f25] border-l-2 border-white/10 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -bottom-[150px] -right-[150px] w-[400px] h-[400px] bg-[#d42422]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex flex-col items-center gap-5 relative z-10">
          <div className="bg-white p-5 rounded-2xl shadow-xl shadow-black/20">
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`}
              size={180}
              bgColor="#ffffff"
              fgColor="#0a0f25"
              level="M"
            />
          </div>
          <p className="text-sm text-gray-400 uppercase tracking-[0.2em] font-bold">Scan voor details</p>
        </div>
      </div>
    </div>
  );
}
