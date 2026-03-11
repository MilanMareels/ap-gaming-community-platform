'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Monitor, Gamepad2, CheckCircle, AlertTriangle, Users, Gamepad } from 'lucide-react';
import { apiClient } from '@/api';
import type { TimeTableEntry, ReservationSlot, Setting } from '@/api';

/** Convert ISO datetime or HH:mm string to minutes since midnight */
const timeToMins = (t: string) => {
  if (/^\d{2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  // ISO datetime string — parse and extract UTC hours/minutes
  const d = new Date(t);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

export default function ReservationsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);
  const [existingReservations, setExistingReservations] = useState<ReservationSlot[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({
    pc: 5,
    ps5: 1,
    switch: 1,
    controller: 8,
    'Nintendo Controllers': 4,
  });

  const [formData, setFormData] = useState({
    sNumber: '',
    name: '',
    email: '',
    inventory: 'pc',
    date: '',
    startTime: '',
    duration: '60',
    controllers: 1,
    extraController: false,
    acceptedTerms: false,
  });

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timetableRes, settingsRes] = await Promise.all([apiClient.GET('/timetable', {}), apiClient.GET('/settings/inventory', {})]);

        if (timetableRes.data) {
          setTimetable(timetableRes.data as TimeTableEntry[]);
        }

        if (settingsRes.data) {
          const settings = settingsRes.data as Setting[];
          const inventorySettings: Record<string, number> = {};
          settings.forEach((setting) => {
            if (['pc', 'ps5', 'switch', 'controller', 'Nintendo Controllers'].includes(setting.key)) {
              inventorySettings[setting.key] = parseInt(setting.value) || 0;
            }
          });
          if (Object.keys(inventorySettings).length > 0) {
            setInventory({ ...inventory, ...inventorySettings });
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch reservations when date changes
  useEffect(() => {
    if (!formData.date) return;

    const fetchReservations = async () => {
      try {
        const res = await apiClient.GET('/reservations/slots', {
          params: { query: { date: formData.date } },
        });
        if (res.data) {
          setExistingReservations(res.data as ReservationSlot[]);
        }
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      }
    };

    fetchReservations();
  }, [formData.date]);

  const calculateAvailableStartTimes = useCallback(
    (date: string, duration: string, inventoryType: string, controllers: number, extraController: boolean) => {
      if (!date) return [];

      const dateObj = new Date(date + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();
      const daySchedule = timetable.filter((entry) => entry.dayOfWeek === dayOfWeek && entry.type === 'OPEN');

      if (daySchedule.length === 0) return [];

      const availableTimes: string[] = [];
      const requiredDuration = parseInt(duration);

      const now = new Date();
      const isToday = date === now.toISOString().split('T')[0];
      const currentTimeMins = now.getHours() * 60 + now.getMinutes();

      daySchedule.forEach((slot) => {
        let currentMins = timeToMins(slot.startTime);
        const endMins = timeToMins(slot.endTime);

        while (currentMins + requiredDuration <= endMins) {
          if (isToday && currentMins <= currentTimeMins) {
            currentMins += 30;
            continue;
          }

          const startStr = minsToTime(currentMins);
          const endStr = minsToTime(currentMins + requiredDuration);
          const endMinsCalc = currentMins + requiredDuration;

          const hardwareCount = existingReservations.filter(
            (r) => r.inventory === inventoryType && timeToMins(r.startTime) < endMinsCalc && timeToMins(r.endTime) > currentMins,
          ).length;

          const maxHardware = inventory[inventoryType] || 0;

          let controllersNeeded = 0;
          let maxControllers = 0;
          let controllersInUse = 0;

          if (inventoryType === 'switch') {
            controllersNeeded = controllers;
            maxControllers = inventory['Nintendo Controllers'] || 0;
            controllersInUse = existingReservations
              .filter((r) => r.inventory === 'switch' && timeToMins(r.startTime) < endMinsCalc && timeToMins(r.endTime) > currentMins)
              .reduce((sum, r) => sum + (r.controllers || 0), 0);
          } else {
            controllersNeeded = inventoryType === 'ps5' ? controllers : extraController ? 1 : 0;
            maxControllers = inventory.controller || 0;
            controllersInUse = existingReservations
              .filter((r) => r.inventory !== 'switch' && timeToMins(r.startTime) < endMinsCalc && timeToMins(r.endTime) > currentMins)
              .reduce((sum, r) => sum + (r.controllers || 0), 0);
          }

          if (hardwareCount < maxHardware && (controllersNeeded === 0 || controllersInUse + controllersNeeded <= maxControllers)) {
            availableTimes.push(startStr);
          }

          currentMins += 30;
        }
      });

      return availableTimes;
    },
    [timetable, existingReservations, inventory],
  );

  const availableStartTimes = useMemo(() => {
    return calculateAvailableStartTimes(formData.date, formData.duration || '60', formData.inventory, formData.controllers, formData.extraController);
  }, [calculateAvailableStartTimes, formData.date, formData.duration, formData.inventory, formData.controllers, formData.extraController]);

  const checkAvailability = useCallback(
    (count: number) => {
      if (!formData.date) return true;
      return calculateAvailableStartTimes(formData.date, formData.duration || '60', formData.inventory, count, formData.extraController).length > 0;
    },
    [calculateAvailableStartTimes, formData.date, formData.duration, formData.inventory, formData.extraController],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!/^s[0-9]+$/.test(formData.sNumber.toLowerCase())) {
        throw new Error('Gebruik een geldig s-nummer (s + cijfers).');
      }
      if (!formData.email.endsWith('@student.ap.be')) {
        throw new Error('Gebruik je officiële AP email.');
      }
      if (!formData.startTime) {
        throw new Error('Selecteer een starttijd.');
      }

      const startMins = timeToMins(formData.startTime);
      const duration = parseInt(formData.duration || '60');
      const endMins = startMins + duration;

      // Build proper ISO datetime strings for start and end
      const startISO = `${formData.date}T${formData.startTime}:00.000Z`;
      const endISO = `${formData.date}T${minsToTime(endMins)}:00.000Z`;

      const res = await apiClient.POST('/reservations', {
        body: {
          email: formData.email,
          sNumber: formData.sNumber.toLowerCase(),
          startTime: startISO,
          endTime: endISO,
          inventory: formData.inventory as 'pc' | 'ps5' | 'switch',
          controllers: formData.inventory === 'pc' && formData.extraController ? 1 : formData.controllers,
        },
      });

      const response = res as any;
      if (response.error) {
        throw new Error(response.error.message || 'Failed to create reservation');
      }

      if (!res.data) {
        throw new Error('Failed to create reservation');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateString(today);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 3);
  const maxDateStr = getLocalDateString(maxDate);

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-green-500/50 p-8 rounded-2xl text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Reservatie Ontvangen!</h2>
          <p className="text-gray-400">Je hebt succesvol een slot geboekt. Zorg dat je op tijd bent.</p>
          <button onClick={() => window.location.reload()} className="mt-6 text-red-500 hover:text-white underline">
            Nieuwe reservatie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24 px-4 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-2">
          RESERVEER <span className="text-red-600">GEAR</span>
        </h1>
        <p className="text-gray-400 mb-8">Boek een PC of PS5. Let op de regels.</p>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-4 md:p-8 rounded-3xl space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">S-Nummer</label>
              <input
                required
                type="text"
                placeholder="s123456"
                value={formData.sNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[sS][0-9]*$/.test(val)) {
                    setFormData({ ...formData, sNumber: val.toLowerCase() });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AP Email</label>
              <input
                required
                type="email"
                placeholder="naam@student.ap.be"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kies Hardware</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'pc', label: 'PC', icon: Monitor, color: 'red' },
                { id: 'ps5', label: 'PS5', icon: Gamepad2, color: 'blue' },
                { id: 'switch', label: 'Switch', icon: Gamepad, color: 'red' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      inventory: item.id,
                      startTime: '',
                    })
                  }
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    formData.inventory === item.id
                      ? `bg-${item.color}-600 border-${item.color}-500 text-white`
                      : 'bg-slate-950 border-slate-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <item.icon size={28} />
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(formData.inventory === 'ps5' || formData.inventory === 'switch') && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 items-center gap-2">
                <Users size={14} /> Aantal Spelers (Controllers)
              </label>
              <div className="flex gap-2">
                {Array.from({
                  length: Math.min(4, formData.inventory === 'switch' ? inventory['Nintendo Controllers'] || 0 : inventory.controller || 0),
                }).map((_, i) => {
                  const n = i + 1;
                  const isAvailable = checkAvailability(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          controllers: n,
                          startTime: '',
                        })
                      }
                      className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                        formData.controllers === n
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : isAvailable
                            ? 'bg-slate-900 border-slate-700 text-gray-400 hover:border-gray-600'
                            : 'bg-slate-900 border-slate-800 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {formData.date && !checkAvailability(1) && (
                <p className="text-xs text-red-500 mt-2">Geen controllers meer beschikbaar op deze datum.</p>
              )}
            </div>
          )}

          {formData.inventory === 'pc' && (
            <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    extraController: !formData.extraController,
                    startTime: '',
                  })
                }
                className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.extraController ? 'bg-red-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.extraController ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-sm text-gray-300 font-bold flex items-center gap-2">
                <Gamepad2 size={16} /> Ik wil ook een controller gebruiken
              </span>
            </div>
          )}

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Calendar size={18} /> Planning
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="min-w-0">
                <label className="text-xs text-gray-500">Datum</label>
                <input
                  required
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={formData.date}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val > maxDateStr) val = maxDateStr;
                    if (val < todayStr && val !== '') val = todayStr;
                    setFormData({ ...formData, date: val, startTime: '' });
                  }}
                  className="w-90 max-w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Duur</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-white"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: e.target.value,
                      startTime: '',
                    })
                  }
                >
                  <option value="60">1 Uur</option>
                  <option value="90">1.5 Uur</option>
                  <option value="120">2 Uur</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Start Tijd</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {availableStartTimes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, startTime: t })}
                      className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                        formData.startTime === t
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {formData.date && availableStartTimes.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Geen beschikbare sloten voor deze selectie.</p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              required
              id="terms"
              checked={formData.acceptedTerms}
              onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
              className="mt-1 w-5 h-5 accent-red-600"
            />
            <label htmlFor="terms" className="text-sm text-gray-400">
              Ik ga akkoord met de{' '}
              <a href="/info" className="text-red-500 underline">
                huisregels
              </a>
              . Ik draag zorg voor het materiaal en laat de plek netjes achter. Bij schade wordt mijn studentenaccount belast.
            </label>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-slate-950 font-black py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Bezig met controleren...' : 'RESERVEER NU'}
          </button>
        </form>
      </div>
    </div>
  );
}
