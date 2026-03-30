'use client';

import { Info } from 'lucide-react';
import type { ReservationFormData } from './types';

interface StepIdentityProps {
  data: ReservationFormData;
  updateData: (updates: Partial<ReservationFormData>) => void;
  setError: (msg: string) => void;
  error?: string;
  onNext: () => void;
}

export function StepIdentity({ data, updateData, setError, error, onNext }: StepIdentityProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-sm mb-4">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Studentennummer</label>
          <input
            autoFocus
            type="text"
            placeholder="s123456"
            value={data.sNumber}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              const val = e.target.value;
              // Allow typing s/S and numbers
              if (val === '' || /^[sS][0-9]*$/.test(val)) {
                updateData({ sNumber: val.toLowerCase() });
                setError('');
              }
            }}
            className="w-full bg-[#0a0f25] border border-white/10 rounded-xl p-4 text-white text-lg outline-none focus:border-[#d42422] transition-colors placeholder:text-gray-600 focus:ring-1 focus:ring-[#d42422]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">AP Email Adres</label>
          <input
            type="email"
            placeholder="naam@student.ap.be"
            value={data.email}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              updateData({ email: e.target.value });
              setError('');
            }}
            className="w-full bg-[#0a0f25] border border-white/10 rounded-xl p-4 text-white text-lg outline-none focus:border-[#d42422] transition-colors placeholder:text-gray-600 focus:ring-1 focus:ring-[#d42422]"
          />
        </div>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
        <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-blue-200">Je ontvangt een bevestiging en QR-code op dit mailadres. Zorg dat het correct is.</p>
      </div>
    </div>
  );
}
