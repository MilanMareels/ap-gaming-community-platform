'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { TimeTableEntry } from '@/api';

const DAYS = [
  { dayOfWeek: 1, label: 'Maandag' },
  { dayOfWeek: 2, label: 'Dinsdag' },
  { dayOfWeek: 3, label: 'Woensdag' },
  { dayOfWeek: 4, label: 'Donderdag' },
  { dayOfWeek: 5, label: 'Vrijdag' },
  { dayOfWeek: 6, label: 'Zaterdag' },
  { dayOfWeek: 0, label: 'Zondag' },
];

/** Parse HH:mm from either "HH:mm" or ISO datetime */
function toHHmm(val: string): string {
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return d.toISOString().slice(11, 16);
}

interface LocalSlot {
  /** Existing entry ID, or null for new */
  id: number | null;
  start: string;
  end: string;
  label: string;
  type: 'OPEN' | 'CLOSED';
}

interface DayState {
  dayOfWeek: number;
  dayLabel: string;
  slots: LocalSlot[];
}

export default function AdminTimetablePage() {
  const [week, setWeek] = useState<DayState[]>([]);
  const [serverEntries, setServerEntries] = useState<TimeTableEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const buildWeek = useCallback((entries: TimeTableEntry[]): DayState[] => {
    return DAYS.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      dayLabel: d.label,
      slots: entries
        .filter((e) => e.dayOfWeek === d.dayOfWeek)
        .sort((a, b) => toHHmm(a.startTime).localeCompare(toHHmm(b.startTime)))
        .map((e) => ({
          id: e.id,
          start: toHHmm(e.startTime),
          end: toHHmm(e.endTime),
          label: e.label,
          type: e.type as 'OPEN' | 'CLOSED',
        })),
    }));
  }, []);

  async function fetchTimetable() {
    try {
      const res = await apiClient.GET('/timetable', {});
      if (res.data) {
        const entries = res.data as TimeTableEntry[];
        setServerEntries(entries);
        setWeek(buildWeek(entries));
      }
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    }
  }

  useEffect(() => {
    fetchTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSlot = (
    dayIdx: number,
    slotIdx: number,
    field: keyof LocalSlot,
    value: string,
  ) => {
    setWeek((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIdx].slots[slotIdx] = {
        ...next[dayIdx].slots[slotIdx],
        [field]: value,
      };
      return next;
    });
  };

  const addSlot = (dayIdx: number) => {
    setWeek((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIdx].slots.push({
        id: null,
        start: '09:00',
        end: '18:00',
        label: 'Open toegang',
        type: 'OPEN',
      });
      return next;
    });
  };

  const removeSlot = (dayIdx: number, slotIdx: number) => {
    setWeek((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIdx].slots.splice(slotIdx, 1);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Collect all current slot IDs that still exist
      const currentIds = new Set<number>();
      const toCreate: { dayOfWeek: number; slot: LocalSlot }[] = [];
      const toUpdate: { id: number; slot: LocalSlot }[] = [];

      for (const day of week) {
        for (const slot of day.slots) {
          if (slot.id !== null) {
            currentIds.add(slot.id);
            // Check if changed
            const original = serverEntries.find((e) => e.id === slot.id);
            if (
              original &&
              (toHHmm(original.startTime) !== slot.start ||
                toHHmm(original.endTime) !== slot.end ||
                original.label !== slot.label ||
                original.type !== slot.type)
            ) {
              toUpdate.push({ id: slot.id, slot });
            }
          } else {
            toCreate.push({ dayOfWeek: day.dayOfWeek, slot });
          }
        }
      }

      // Delete entries that no longer exist in local state
      const toDelete = serverEntries.filter((e) => !currentIds.has(e.id));

      // Execute all operations
      await Promise.all([
        ...toDelete.map((e) =>
          apiClient.DELETE('/timetable/{id}', {
            params: { path: { id: e.id.toString() } },
          }),
        ),
        ...toUpdate.map((u) =>
          apiClient.PATCH('/timetable/{id}', {
            params: { path: { id: u.id.toString() } },
            body: {
              startTime: u.slot.start,
              endTime: u.slot.end,
              label: u.slot.label,
              type: u.slot.type,
            },
          }),
        ),
        ...toCreate.map((c) =>
          apiClient.POST('/timetable', {
            body: {
              dayOfWeek: c.dayOfWeek,
              startTime: c.slot.start,
              endTime: c.slot.end,
              label: c.slot.label,
              type: c.slot.type,
            },
          }),
        ),
      ]);

      // Re-fetch to sync state
      await fetchTimetable();
    } catch (err) {
      console.error('Failed to save timetable:', err);
      alert('Er ging iets mis bij het opslaan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='bg-slate-900 rounded-xl border border-slate-800 p-6'>
      <div className='flex justify-between items-center mb-8 sticky top-0 z-10 bg-slate-900 py-2 border-b border-slate-800'>
        <div>
          <h2 className='font-bold text-2xl text-white'>Weekplanning</h2>
          <p className='text-gray-400 text-sm'>
            Beheer hier de openingsuren per dag.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={20} /> {saving ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>

      <div className='space-y-6'>
        {week.map((day, dIdx) => {
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
          return (
            <div
              key={day.dayOfWeek}
              className={`border rounded-xl overflow-hidden bg-slate-950/50 ${
                isWeekend ? 'border-slate-800 opacity-60' : 'border-slate-700'
              }`}
            >
              <div className='bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-800'>
                <span className='font-black text-lg text-gray-200 uppercase tracking-wide'>
                  {day.dayLabel}
                </span>
                <button
                  onClick={() => addSlot(dIdx)}
                  className='text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors'
                >
                  <Plus size={14} /> Tijd toevoegen
                </button>
              </div>

              <div className='p-4 space-y-3'>
                {day.slots.length === 0 ? (
                  <div className='text-center text-gray-600 italic py-2 text-sm'>
                    Gesloten
                  </div>
                ) : (
                  day.slots.map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      className='flex flex-col md:flex-row gap-4 items-center bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm'
                    >
                      <div className='flex items-center gap-3'>
                        <Clock size={16} className='text-gray-500' />
                        <div className='flex flex-col'>
                          <span className='text-[10px] uppercase text-gray-500 font-bold'>
                            Van
                          </span>
                          <input
                            type='time'
                            className='bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500 font-mono [&::-webkit-calendar-picker-indicator]:invert'
                            value={slot.start}
                            onChange={(e) =>
                              updateSlot(dIdx, sIdx, 'start', e.target.value)
                            }
                          />
                        </div>
                        <span className='text-gray-500 mt-3'>-</span>
                        <div className='flex flex-col'>
                          <span className='text-[10px] uppercase text-gray-500 font-bold'>
                            Tot
                          </span>
                          <input
                            type='time'
                            className='bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500 font-mono [&::-webkit-calendar-picker-indicator]:invert'
                            value={slot.end}
                            onChange={(e) =>
                              updateSlot(dIdx, sIdx, 'end', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className='flex-1 w-full'>
                        <span className='text-[10px] uppercase text-gray-500 font-bold block mb-1'>
                          Activiteit
                        </span>
                        <input
                          type='text'
                          placeholder='bv. Open Access'
                          className='w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500'
                          value={slot.label}
                          onChange={(e) =>
                            updateSlot(dIdx, sIdx, 'label', e.target.value)
                          }
                        />
                      </div>

                      <div className='w-full md:w-auto flex items-end gap-2'>
                        <div className='w-full'>
                          <span className='text-[10px] uppercase text-gray-500 font-bold block mb-1'>
                            Status
                          </span>
                          <select
                            className={`w-full bg-slate-950 border rounded p-2 text-sm outline-none font-bold ${
                              slot.type === 'OPEN'
                                ? 'text-green-400 border-green-900'
                                : 'text-red-400 border-red-900'
                            }`}
                            value={slot.type}
                            onChange={(e) =>
                              updateSlot(dIdx, sIdx, 'type', e.target.value)
                            }
                          >
                            <option value='OPEN'>Geopend (Groen)</option>
                            <option value='CLOSED'>Gesloten (Rood)</option>
                          </select>
                        </div>

                        <button
                          onClick={() => removeSlot(dIdx, sIdx)}
                          className='bg-red-900/20 text-red-500 hover:bg-red-900/40 p-2.5 rounded transition-colors mb-px'
                          title='Verwijder'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className='mt-8 flex justify-end'>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={20} /> {saving ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </div>
  );
}
