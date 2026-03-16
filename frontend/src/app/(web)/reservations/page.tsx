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
    controllers: 0,
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
      <div className="min-h-screen bg-transparent flex items-center justify-center px-6 relative">
        <div className="bg-[#020618] border border-green-500/30 p-10 rounded-[2rem] text-center max-w-md relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-green-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6 relative z-10" strokeWidth={1.5} />
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-3 relative z-10">Reservatie Ontvangen!</h2>
          <p className="text-lg text-gray-400 mb-6 leading-relaxed relative z-10">Je hebt succesvol een slot geboekt. Zorg dat je op tijd bent.</p>
          <p className="text-lg text-gray-400 relative z-10">Check je mailbox voor een bevestigingsmail met je QR code!</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 text-[#d42422] font-medium hover:text-white transition-colors relative z-10"
          >
            Nieuwe reservatie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-24 px-6 relative">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-[#d42422] rounded-full blur-[100px] md:blur-[150px] opacity-20 pointer-events-none"></div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-center mb-4 relative z-10">
            Reserveer <span className="text-[#d42422]">Gear</span>
          </h1>
          <p className="text-lg text-gray-400 text-center relative z-10">Boek een PC of console. Let op de regels.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#020618] border border-white/10 p-6 md:p-10 rounded-[2rem] space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#d42422] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">S-Nummer</label>
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
                className="w-full bg-[#0a0f25] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-[#d42422] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">AP Email</label>
              <input
                required
                type="email"
                placeholder="naam@student.ap.be"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0a0f25] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-[#d42422] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-4">Kies Hardware</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'pc', label: 'PC', icon: Monitor },
                { id: 'ps5', label: 'PS5', icon: Gamepad2 },
                { id: 'switch', label: 'Switch', icon: Gamepad },
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
                  className={`p-6 rounded-[1.5rem] border flex flex-col items-center gap-3 transition-all duration-300 ${
                    formData.inventory === item.id
                      ? `bg-[#d42422] border-[#d42422] text-white shadow-[0_0_20px_rgba(212,36,34,0.3)] scale-[1.02]`
                      : 'bg-[#0a0f25] border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <item.icon size={32} strokeWidth={1.5} />
                  <span className="font-semibold text-lg">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(formData.inventory === 'ps5' || formData.inventory === 'switch') && (
            <div className="bg-[#0a0f25] p-6 rounded-[1.5rem] border border-white/10">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-4">
                <Users size={18} strokeWidth={1.5} /> Aantal Spelers (Controllers)
              </label>
              <div className="flex gap-3">
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
                      className={`flex-1 py-3 rounded-xl font-semibold border transition-all text-lg ${
                        formData.controllers === n
                          ? 'bg-[#d42422] border-[#d42422] text-white shadow-[0_0_15px_rgba(212,36,34,0.3)]'
                          : isAvailable
                            ? 'bg-[#020618] border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5'
                            : 'bg-[#020618]/50 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {formData.date && !checkAvailability(1) && (
                <p className="text-sm text-red-500 mt-3 font-medium">Geen controllers meer beschikbaar op deze datum.</p>
              )}
            </div>
          )}

          {formData.inventory === 'pc' && (
            <div
              className="flex items-center justify-between bg-[#0a0f25] p-6 rounded-[1.5rem] border border-white/10 cursor-pointer"
              onClick={() => setFormData({ ...formData, extraController: !formData.extraController, startTime: '' })}
            >
              <span className="text-base text-gray-300 font-semibold flex items-center gap-3">
                <Gamepad2 size={24} className="text-[#d42422]" strokeWidth={1.5} /> Ik wil ook een controller gebruiken
              </span>
              <button
                type="button"
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${formData.extraController ? 'bg-[#d42422]' : 'bg-gray-700'}`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.extraController ? 'translate-x-6' : ''}`}
                />
              </button>
            </div>
          )}

          <div className="p-6 bg-[#0a0f25] border border-white/10 rounded-[1.5rem]">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Calendar size={18} /> Planning
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-400 mb-2">Datum</label>
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
                  className="w-full bg-[#020618] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#d42422] transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Duur</label>
                <select
                  className="w-full bg-[#020618] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#d42422] transition-colors"
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
                <label className="block text-sm font-medium text-gray-400 mb-2">Start Tijd</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableStartTimes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, startTime: t })}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                        formData.startTime === t
                          ? 'bg-[#d42422] border-[#d42422] text-white shadow-[0_0_15px_rgba(212,36,34,0.3)]'
                          : 'bg-[#020618] border-white/10 text-gray-400 hover:border-white/30'
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

          <div className="flex items-start gap-4 p-4 rounded-xl bg-[#0a0f25] border border-white/10">
            <input
              type="checkbox"
              required
              id="terms"
              checked={formData.acceptedTerms}
              onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
              className="mt-1 w-5 h-5 accent-[#d42422] rounded cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer select-none">
              Ik ga akkoord met de{' '}
              <a href="/info" className="text-[#d42422] font-medium hover:text-white transition-colors underline underline-offset-2">
                huisregels
              </a>
              . Ik draag zorg voor het materiaal en laat de plek netjes achter. Bij schade wordt mijn studentenaccount belast.
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group inline-flex items-center justify-center gap-3 bg-linear-to-r from-[#d42422] to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(212,36,34,0.3)] hover:shadow-[0_0_30px_rgba(212,36,34,0.5)] tracking-wide border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bezig met controleren...' : 'RESERVEER NU'}
          </button>
        </form>
      </div>
    </div>
  );
}
