'use client';

import { useMemo } from 'react';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ReservationFormData } from './types';
import type { TimeTableEntry } from '@/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StepDateTimeProps {
  data: ReservationFormData;
  updateData: (updates: Partial<ReservationFormData>) => void;
  availableStartTimes: string[];
  timetable: TimeTableEntry[];
}

export function StepDateTime({ data, updateData, availableStartTimes, timetable }: StepDateTimeProps) {
  // Generate next available days based on timetable
  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();

    // Check availability only for today + next 3 days
    for (let i = 0; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = d.getDay();

      // Check if there is an OPEN slot for this day
      const isOpen = timetable.some((t) => t.dayOfWeek === dayOfWeek && t.type === 'OPEN');

      if (isOpen) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let label = '';
        if (i === 0) label = 'Vandaag';
        else if (i === 1) label = 'Morgen';
        else {
          label = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
          // Capitalize first letter
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }

        options.push({ value: dateStr, label: label });
      }
    }
    return options;
  }, [timetable]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Datum</label>
          <div className="relative">
            <select
              value={data.date}
              className="w-full appearance-none bg-[#0a0f25] border border-white/10 rounded-xl p-4 text-white text-lg outline-none focus:border-[#d42422] transition-colors cursor-pointer"
              onChange={(e) => {
                updateData({ date: e.target.value, startTime: '' }); // Reset time on date change
              }}
            >
              <option value="" disabled>
                Kies een datum
              </option>
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <CalendarIcon size={20} />
            </div>
          </div>
        </div>

        {/* Duration Selector */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-400 mb-2">Duur</label>
          <div className="flex bg-[#0a0f25] p-1.5 rounded-xl border border-white/10 h-[62px]">
            {['60', '90', '120'].map((opt) => (
              <button
                key={opt}
                onClick={() => updateData({ duration: opt, startTime: '' })}
                className={cn(
                  'flex-1 rounded-lg text-sm font-semibold transition-all duration-200',
                  data.duration === opt ? 'bg-[#d42422] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5',
                )}
              >
                {parseInt(opt) / 60}u
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Grid */}
      <AnimatePresence mode="wait">
        {data.date && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-2">
            <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Clock size={16} /> Beschikbare Tijdsloten
            </label>

            {availableStartTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableStartTimes.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      updateData({ startTime: t });
                      // Let parent handle auto-advance if needed, or user clicks next.
                    }}
                    className={cn(
                      'py-3 px-2 rounded-xl text-sm font-bold border transition-all hover:scale-105 active:scale-95 duration-200',
                      data.startTime === t
                        ? 'bg-[#d42422] border-[#d42422] text-white shadow-lg shadow-red-900/40'
                        : 'bg-[#0a0f25] border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#0a0f25] rounded-2xl border border-white/5 border-dashed">
                <p className="text-gray-400 text-sm">Geen momenten beschikbaar op deze dag met de gekozen duur.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
