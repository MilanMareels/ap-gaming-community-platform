'use client';

import { Monitor, Gamepad2, Gamepad, Users, XCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ReservationFormData } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StepHardwareProps {
  data: ReservationFormData;
  updateData: (updates: Partial<ReservationFormData>) => void;
  availability: {
    pc: boolean;
    ps5: boolean;
    switch: boolean;
  };
  maxControllersFn: (type: string) => number;
}

export function StepHardware({ data, updateData, availability, maxControllersFn }: StepHardwareProps) {
  const maxControllers = data.inventory ? maxControllersFn(data.inventory) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'pc', label: 'PC', icon: Monitor, desc: 'High-end gaming', available: availability.pc },
          { id: 'ps5', label: 'PS5', icon: Gamepad2, desc: 'Next-gen console', available: availability.ps5 },
          { id: 'switch', label: 'Switch', icon: Gamepad, desc: 'Fun for everyone', available: availability.switch },
        ].map((item) => (
          <button
            key={item.id}
            disabled={!item.available}
            onClick={() => {
              updateData({
                inventory: item.id as 'pc' | 'ps5' | 'switch',
                controllers: 0,
                extraController: false,
              });
            }}
            className={cn(
              'p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 transition-all duration-300 h-40 group relative overflow-hidden',
              !item.available && 'opacity-40 grayscale cursor-not-allowed border-white/5 bg-white/5',
              item.available && data.inventory === item.id
                ? 'bg-[#d42422] border-[#d42422] text-white shadow-[0_0_20px_rgba(212,36,34,0.3)] scale-[1.02]'
                : item.available && 'bg-[#0a0f25] border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5',
            )}
          >
            {item.available ? (
              <div
                className={cn(
                  'absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300',
                  data.inventory === item.id ? 'opacity-100' : 'group-hover:opacity-100',
                )}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <span className="bg-red-500/80 text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Volzet</span>
              </div>
            )}

            <item.icon size={40} strokeWidth={1.5} className="relative z-10 transition-transform group-hover:scale-110 duration-300" />
            <div className="relative z-10 text-center">
              <span className="font-bold text-lg block">{item.label}</span>
              {!item.available && <span className="text-xs block mt-1 text-red-300">Niet beschikbaar</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Dynamic Config Area */}
      <AnimatePresence mode="wait">
        {(data.inventory === 'ps5' || data.inventory === 'switch') && (
          <motion.div
            key="console-config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5"
          >
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Users size={16} /> Aantal Spelers
              </label>
              <span className="text-xs text-gray-500 uppercase font-bold">{maxControllers} Beschikbaar</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => {
                const n = i + 1;
                const isAvailable = n <= maxControllers;
                return (
                  <button
                    key={n}
                    disabled={!isAvailable}
                    onClick={() => updateData({ controllers: n })}
                    className={cn(
                      'py-3 rounded-lg font-bold text-lg border transition-all duration-200',
                      data.controllers === n
                        ? 'bg-[#d42422] border-[#d42422] text-white shadow-md'
                        : isAvailable
                          ? 'bg-[#0a0f25] border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/5'
                          : 'bg-[#0a0f25] border-white/5 text-gray-600 cursor-not-allowed opacity-50',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {maxControllers === 0 && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <XCircle size={12} /> Geen controllers beschikbaar op dit moment.
              </p>
            )}
          </motion.div>
        )}

        {data.inventory === 'pc' && (
          <motion.div key="pc-config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <button
              disabled={maxControllersFn('pc') < 1 && !data.extraController}
              onClick={() => updateData({ extraController: !data.extraController })}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group text-left',
                data.extraController
                  ? 'bg-[#d42422]/10 border-[#d42422] shadow-[0_0_15px_rgba(212,36,34,0.1)]'
                  : maxControllersFn('pc') < 1
                    ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-[#0a0f25] border-white/10 hover:border-white/20 hover:bg-white/5',
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    data.extraController ? 'bg-[#d42422] text-white' : 'bg-white/5 text-gray-400 group-hover:text-white',
                  )}
                >
                  <Gamepad2 size={24} />
                </div>
                <div>
                  <span
                    className={cn(
                      'block font-semibold transition-colors',
                      data.extraController ? 'text-white' : 'text-gray-300 group-hover:text-white',
                    )}
                  >
                    Extra Controller
                  </span>
                  <span className="text-xs text-gray-500">
                    {maxControllersFn('pc') < 1 && !data.extraController
                      ? 'Geen controllers meer beschikbaar'
                      : 'Ik wil een controller gebruiken aan de PC'}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                  data.extraController ? 'border-[#d42422] bg-[#d42422]' : 'border-gray-600 group-hover:border-gray-400',
                )}
              >
                {data.extraController && <CheckCircle size={14} className="text-white" />}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
