'use client';

import { useState, useEffect } from 'react';
import { Clock, Ban } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { TimeTableEntry } from '@/api';

const DAYS_MAP = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

// Only show weekdays (Mon–Fri = indices 1–5)
const WEEKDAY_INDICES = [1, 2, 3, 4, 5];

function formatTime(val: string): string {
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(11, 16);
}

function getSlotStyle(type: string) {
  switch (type) {
    case 'OPEN':
      return 'bg-green-500/10 border-green-500/30 text-green-300';
    case 'CLOSED':
      return 'bg-red-500/5 border-red-500/20 text-red-400 opacity-60';
    default:
      return 'bg-[#0a0f25] border-white/10 text-gray-300';
  }
}

function getIconStyle(type: string) {
  switch (type) {
    case 'OPEN':
      return 'bg-green-500/20 text-green-400';
    case 'CLOSED':
      return 'bg-red-500/20 text-red-500';
    default:
      return 'bg-white/5 text-gray-400';
  }
}

export default function SchedulePage() {
  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [liveStatus, setLiveStatus] = useState({
    status: 'CLOSED',
    label: 'Gesloten',
    color: 'red' as 'red' | 'green',
  });

  useEffect(() => {
    fetchTimetable();
  }, []);

  async function fetchTimetable() {
    try {
      const res = await apiClient.GET('/timetable', {});
      if (res.data) {
        setTimetable(res.data as TimeTableEntry[]);
      }
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    } finally {
      setLoading(false);
    }
  }

  // Live status: check every 60s which slot is currently active
  useEffect(() => {
    const check = () => {
      if (timetable.length === 0) return;

      const now = new Date();
      const currentDay = now.getDay(); // 0=Sun, 1=Mon, ...
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const todaySlots = timetable.filter((e) => e.dayOfWeek === currentDay);
      let foundActive = false;

      for (const slot of todaySlots) {
        const startTime = formatTime(slot.startTime);
        const endTime = formatTime(slot.endTime);
        const [sH, sM] = startTime.split(':').map(Number);
        const [eH, eM] = endTime.split(':').map(Number);
        const start = sH * 60 + sM;
        const end = eH * 60 + eM;

        if (currentMins >= start && currentMins < end) {
          foundActive = true;
          if (slot.type === 'OPEN') {
            setLiveStatus({
              status: 'OPEN',
              label: slot.label || 'Geopend',
              color: 'green',
            });
          } else {
            setLiveStatus({
              status: 'CLOSED',
              label: slot.label || 'Gesloten',
              color: 'red',
            });
          }
          break;
        }
      }

      if (!foundActive) {
        setLiveStatus({ status: 'CLOSED', label: 'Gesloten', color: 'red' });
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [timetable]);

  // Group by weekday
  const schedule = WEEKDAY_INDICES.map((dayIndex) => ({
    day: DAYS_MAP[dayIndex],
    slots: timetable.filter((e) => e.dayOfWeek === dayIndex),
  }));

  const getStatusClasses = () => {
    return liveStatus.color === 'green'
      ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
      : 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]';
  };

  const getDotColor = () => {
    return liveStatus.color === 'green' ? 'bg-green-500' : 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-white relative z-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d42422]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white py-24 px-4 flex items-center justify-center relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-[#d42422] rounded-full blur-[100px] md:blur-[150px] opacity-20 pointer-events-none"></div>

      <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row gap-16 relative z-10">
        {/* Left column: Title + Live Status */}
        <div className="lg:w-1/3">
          <ScrollReveal direction="left">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
              Openings<span className="text-[#d42422]">uren</span>
            </h1>

            <div className={`p-6 rounded-2xl border mb-8 transition-colors duration-500 ${getStatusClasses()}`}>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${getDotColor()}`} />
                Live Status
              </h4>
              <p className="opacity-90 text-sm">
                Momenteel: <span className="font-bold block text-2xl mt-1">{liveStatus.label}</span>
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Right column: Week schedule */}
        <div className="lg:w-2/3 space-y-4">
          {schedule.length === 0 && (
            <div className="text-gray-400 italic bg-[#0a0f25] border border-white/10 p-8 rounded-[1.5rem] text-center">Rooster laden...</div>
          )}

          {schedule.map((day, idx) => (
            <ScrollReveal key={day.day} direction="right" delay={idx * 50}>
              <div className="flex flex-col md:flex-row bg-[#020618] border border-white/10 rounded-[1.5rem] overflow-hidden hover:border-[#d42422]/30 transition-colors group">
                {/* Day abbreviation sidebar */}
                <div className="bg-white/5 p-6 w-full md:w-32 flex items-center justify-center font-black text-lg uppercase tracking-wider text-gray-300 border-b md:border-b-0 md:border-r border-white/10 group-hover:bg-white/10 transition-colors">
                  {day.day.substring(0, 3)}
                </div>

                {/* Slots */}
                <div className="flex-1 p-4 grid gap-3">
                  {day.slots.length > 0 ? (
                    day.slots.map((slot) => (
                      <div key={slot.id} className={`flex items-center gap-4 p-3 rounded-lg border ${getSlotStyle(slot.type)}`}>
                        <div className={`p-2 rounded-md shadow-sm ${getIconStyle(slot.type)}`}>
                          {slot.type === 'CLOSED' ? <Ban size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <span className="block font-bold text-sm md:text-base">{slot.label}</span>
                          <span className="text-xs opacity-70 font-mono block mt-0.5">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic text-sm py-3 px-4 bg-white/5 rounded-lg border border-white/5">Gesloten</div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
