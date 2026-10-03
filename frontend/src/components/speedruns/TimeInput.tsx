'use client';

import { useState, useEffect } from 'react';

interface TimeInputProps {
  value: number; // milliseconds
  onChange: (ms: number) => void;
  label?: string;
  required?: boolean;
}

export function TimeInput({ value, onChange, label, required }: TimeInputProps) {
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [seconds, setSeconds] = useState('0');
  const [millis, setMillis] = useState('0');

  // Sync from prop value to fields
  useEffect(() => {
    const totalSeconds = Math.floor(value / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const ms = value % 1000;

    setHours(String(h));
    setMinutes(String(m));
    setSeconds(String(s));
    setMillis(String(ms));
  }, [value]);

  const emitChange = (h: string, m: string, s: string, ms: string) => {
    const totalMs =
      (parseInt(h) || 0) * 3600000 +
      (parseInt(m) || 0) * 60000 +
      (parseInt(s) || 0) * 1000 +
      (parseInt(ms) || 0);
    onChange(totalMs);
  };

  const inputClass =
    'bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-center outline-none focus:border-red-500 transition-colors font-mono w-16';

  return (
    <div>
      {label && <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">{label} {required && '*'}</label>}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          className={inputClass}
          placeholder="H"
          value={hours}
          onChange={(e) => { setHours(e.target.value); emitChange(e.target.value, minutes, seconds, millis); }}
        />
        <span className="text-gray-500 font-bold">:</span>
        <input
          type="number"
          min={0}
          max={59}
          className={inputClass}
          placeholder="M"
          value={minutes}
          onChange={(e) => { setMinutes(e.target.value); emitChange(hours, e.target.value, seconds, millis); }}
        />
        <span className="text-gray-500 font-bold">:</span>
        <input
          type="number"
          min={0}
          max={59}
          className={inputClass}
          placeholder="S"
          value={seconds}
          onChange={(e) => { setSeconds(e.target.value); emitChange(hours, minutes, e.target.value, millis); }}
        />
        <span className="text-gray-500 font-bold">.</span>
        <input
          type="number"
          min={0}
          max={999}
          className={`${inputClass} w-20`}
          placeholder="ms"
          value={millis}
          onChange={(e) => { setMillis(e.target.value); emitChange(hours, minutes, seconds, e.target.value); }}
        />
      </div>
      <p className="text-[10px] text-gray-600 mt-1">Hours : Minutes : Seconds . Milliseconds</p>
    </div>
  );
}
