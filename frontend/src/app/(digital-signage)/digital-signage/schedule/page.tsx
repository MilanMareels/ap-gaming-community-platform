'use client';

import { useEffect, useState } from 'react';
import { Clock, Ban } from 'lucide-react';
import { apiClient } from '@/api';
import type { TimeTableEntry } from '@/api';

const DAYS_MAP = [
  'Zondag',
  'Maandag',
  'Dinsdag',
  'Woensdag',
  'Donderdag',
  'Vrijdag',
  'Zaterdag',
];

const WEEKDAY_INDICES = [1, 2, 3, 4, 5];

function formatTime(val: string): string {
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(11, 16);
}

export default function DigitalSignageSchedulePage() {
  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);

  const [liveStatus, setLiveStatus] = useState({
    status: 'CLOSED',
    label: 'Gesloten',
    color: 'red' as 'red' | 'green',
  });

  async function fetchTimetable() {
    try {
      const res = await apiClient.GET('/timetable', {});
      if (res.data) {
        setTimetable(res.data as TimeTableEntry[]);
      }
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    }
  }

  useEffect(() => {
    fetchTimetable();
    // Refresh data every 5 minutes
    const dataInterval = setInterval(fetchTimetable, 300000);
    return () => clearInterval(dataInterval);
  }, []);

  // Live status update every minute
  useEffect(() => {
    const check = () => {
      if (timetable.length === 0) return;

      const now = new Date();
      const currentDay = now.getDay();
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

  const schedule = WEEKDAY_INDICES.map((dayIndex) => ({
    day: DAYS_MAP[dayIndex],
    slots: timetable.filter((e) => e.dayOfWeek === dayIndex),
  }));

  const getStatusClasses = () => {
    return liveStatus.color === 'green'
      ? 'bg-green-500/10 border-green-500/50 text-green-400'
      : 'bg-red-500/10 border-red-500/50 text-red-400';
  };

  const getDotColor = () => {
    return liveStatus.color === 'green' ? 'bg-green-500' : 'bg-red-500';
  };

  const getSlotStyle = (type: string) => {
    switch (type) {
      case 'OPEN':
        return 'bg-green-900/10 border-green-900/30 text-green-200';
      case 'CLOSED':
        return 'bg-red-900/10 border-red-900/30 text-red-400 opacity-60';
      default:
        return 'bg-slate-900 border-slate-800';
    }
  };

  const getIconStyle = (type: string) => {
    switch (type) {
      case 'OPEN':
        return 'bg-green-600 text-white';
      case 'CLOSED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-800 text-gray-400';
    }
  };

  return (
    <div className='h-screen w-screen bg-slate-950 text-white p-6'>
      <div className='w-full h-full flex flex-col'>
        {/* Header with Live Status */}
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-6xl font-black'>
            OPENINGS <span className='text-red-600'>UREN</span>
          </h1>

          <div
            className={`px-10 py-6 rounded-3xl border-4 transition-colors duration-500 ${getStatusClasses()} flex items-center gap-6`}
          >
            <div
              className={`w-6 h-6 rounded-full animate-pulse ${getDotColor()}`}
            />
            <div className='flex items-baseline gap-4'>
              <h4 className='font-bold text-2xl uppercase tracking-wide'>
                Live Status
              </h4>
              <span className='text-xl opacity-70'>→</span>
              <p className='font-black text-4xl'>{liveStatus.label}</p>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className='flex-1 flex flex-col gap-[0.5vh] min-h-0'>
          {schedule.length === 0 && (
            <div className='text-gray-500 italic text-[3vh]'>
              Rooster laden...
            </div>
          )}

          {schedule.map((day) => (
            <div
              key={day.day}
              className='grid grid-cols-[200px_1fr] bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden flex-1'
            >
              <div className='bg-slate-900 px-4 flex items-center justify-center font-black text-[clamp(0.875rem,1.8vh,2rem)] uppercase tracking-wider text-gray-400 border-r-2 border-slate-800'>
                {day.day}
              </div>

              <div className='p-[1vh] flex gap-[1vh] items-stretch'>
                {day.slots.length > 0 ? (
                  day.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-[1vh] px-[2vh] py-[1.5vh] rounded-xl border-2 flex-1 ${getSlotStyle(slot.type)}`}
                    >
                      <div
                        className={`p-[1vh] rounded-lg shadow-sm shrink-0 ${getIconStyle(slot.type)}`}
                      >
                        {slot.type === 'CLOSED' ? (
                          <Ban className='w-[clamp(24px,3.5vh,48px)] h-[clamp(24px,3.5vh,48px)]' />
                        ) : (
                          <Clock className='w-[clamp(24px,3.5vh,48px)] h-[clamp(24px,3.5vh,48px)]' />
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <span className='text-[clamp(1.25rem,3vh,3.5rem)] opacity-70 font-mono block font-bold'>
                          {formatTime(slot.startTime)} -{' '}
                          {formatTime(slot.endTime)}
                        </span>
                        <span className='block font-semibold text-[clamp(0.875rem,1.8vh,2rem)] leading-tight opacity-80'>
                          {slot.label}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-gray-600 italic text-[clamp(1rem,2vh,2rem)] py-[1.5vh] px-6'>
                    Gesloten
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
