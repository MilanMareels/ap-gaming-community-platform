'use client';

import { Monitor, Gamepad2, Gamepad, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReservationFormData } from './types';

interface StepConfirmationProps {
  data: ReservationFormData;
  updateData: (updates: Partial<ReservationFormData>) => void;
  error: string;
}

export function StepConfirmation({ data, updateData, error }: StepConfirmationProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#0a0f25] rounded-2xl p-6 border border-white/10 space-y-4 shadow-inner shadow-black/20">
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Overzicht</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="block text-gray-500 text-xs mb-1">Student</span>
            <span className="text-white font-medium text-base block truncate">{data.sNumber}</span>
          </div>
          <div className="overflow-hidden">
            <span className="block text-gray-500 text-xs mb-1">Email</span>
            <span className="text-white font-medium text-base block truncate" title={data.email}>
              {data.email}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs mb-1">Wanneer</span>
            <span className="text-white font-medium text-base block">{data.date}</span>
            <span className="text-[#d42422] font-mono text-base">{data.startTime}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs mb-1">Duur & Gear</span>
            <div className="flex items-center gap-2">
              <span className="bg-white/10 px-2 py-0.5 rounded text-white font-medium">{parseInt(data.duration) / 60} uur</span>
              <span className="text-white font-medium capitalize flex items-center gap-1">
                {data.inventory === 'pc' && <Monitor size={14} />}
                {data.inventory === 'ps5' && <Gamepad2 size={14} />}
                {data.inventory === 'switch' && <Gamepad size={14} />}
                {data.inventory.toUpperCase()}
              </span>
            </div>
          </div>

          {(data.inventory !== 'pc' || data.extraController) && (
            <div className="col-span-2 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Extra&apos;s</span>
                <span className="text-white font-medium">{data.inventory === 'pc' ? '1 Controller' : `${data.controllers} Controllers`}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0a0f25] border border-white/10 cursor-pointer hover:bg-[#0f1633] transition-colors group">
        <div className="relative flex items-center mt-0.5">
          <input
            type="checkbox"
            checked={data.acceptedTerms}
            onChange={(e) => updateData({ acceptedTerms: e.target.checked })}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-500 bg-transparent checked:border-[#d42422] checked:bg-[#d42422] transition-all group-hover:border-gray-400"
          />
          <CheckCircle
            size={14}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200"
          />
        </div>
        <span className="text-sm text-gray-400 select-none group-hover:text-gray-300 transition-colors">
          Ik ga akkoord met de{' '}
          <a href="/info" target="_blank" className="text-[#d42422] underline hover:text-white" onClick={(e) => e.stopPropagation()}>
            huisregels
          </a>
          . Ik draag zorg voor het materiaal en laat de plek netjes achter.
        </span>
      </label>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2"
        >
          <AlertTriangle size={16} /> {error}
        </motion.div>
      )}
    </div>
  );
}
