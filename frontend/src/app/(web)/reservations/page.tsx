'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, Clock, ChevronRight, ChevronLeft, LogOut, Loader2 } from 'lucide-react';
import { apiClient } from '@/api';
import type { TimeTableEntry, ReservationSlot, Setting, components } from '@/api';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getApiErrorMessage } from '@/util/api-error';

import { StepDateTime } from './_components/StepDateTime';
import { StepHardware } from './_components/StepHardware';
import { StepConfirmation } from './_components/StepConfirmation';
import type { ReservationFormData } from './_components/types';

type AuthProfile = components['schemas']['AuthProfileResponseDto'];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const timeToMins = (t: string) => {
  if (/^\d{2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  const d = new Date(t);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function ReservationsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

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

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const totalSteps = 3;

  const [formData, setFormData] = useState<ReservationFormData>({
    inventory: '',
    date: '',
    startTime: '',
    duration: '60',
    controllers: 0,
    extraController: false,
    acceptedTerms: false,
  });

  const updateFormData = (updates: Partial<ReservationFormData>) => {
    setFormData((prev) => {
      if (updates.inventory && updates.inventory !== prev.inventory) {
        return { ...prev, ...updates, date: '', startTime: '' };
      }
      return { ...prev, ...updates };
    });
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiClient.GET('/auth/profile', {});
        if (res.data) {
          setProfile(res.data);
        }
      } catch {
        // Treat as unauthenticated
      } finally {
        setAuthLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        const [timetableRes, settingsRes] = await Promise.all([apiClient.GET('/timetable', {}), apiClient.GET('/settings/inventory', {})]);

        if (timetableRes.data) setTimetable(timetableRes.data as TimeTableEntry[]);

        if (settingsRes.data) {
          const settings = settingsRes.data as Setting[];
          const inventorySettings: Record<string, number> = {};
          settings.forEach((setting) => {
            if (['pc', 'ps5', 'switch', 'controller', 'Nintendo Controllers'].includes(setting.key)) {
              inventorySettings[setting.key] = parseInt(setting.value) || 0;
            }
          });
          if (Object.keys(inventorySettings).length > 0) {
            setInventory((prev) => ({ ...prev, ...inventorySettings }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, [profile]);

  useEffect(() => {
    if (!formData.date) return;

    const fetchReservations = async () => {
      try {
        const res = await apiClient.GET('/reservations/slots', { params: { query: { date: formData.date } } });
        if (res.data) setExistingReservations(res.data as ReservationSlot[]);
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      }
    };

    fetchReservations();
  }, [formData.date]);

  const isTimeSlotValid = useCallback(
    (startTimeMins: number, durationMins: number, checkInventoryType?: string) => {
      const endMins = startTimeMins + durationMins;
      const checkType = (type: string) => {
        const max = inventory[type] || 0;
        const count = existingReservations.filter(
          (r) => r.inventory === type && timeToMins(r.startTime) < endMins && timeToMins(r.endTime) > startTimeMins,
        ).length;
        return count < max;
      };
      if (checkInventoryType) return checkType(checkInventoryType);
      return checkType('pc') || checkType('ps5') || checkType('switch');
    },
    [existingReservations, inventory],
  );

  const calculateAvailableStartTimes = useCallback(
    (date: string, duration: string, inventoryType?: string) => {
      if (!date) return [];

      const dateObj = new Date(date + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();
      const daySchedule = timetable.filter((entry) => entry.dayOfWeek === dayOfWeek && entry.type === 'OPEN');

      if (daySchedule.length === 0) return [];

      const availableTimes: string[] = [];
      const requiredDuration = parseInt(duration);

      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const localDateStr = `${localYear}-${localMonth}-${localDay}`;

      const isToday = date === localDateStr;
      const currentTimeMins = now.getHours() * 60 + now.getMinutes();

      daySchedule.forEach((slot) => {
        let currentMins = timeToMins(slot.startTime);
        const endMins = timeToMins(slot.endTime);

        while (currentMins + requiredDuration <= endMins) {
          if (isToday && currentMins <= currentTimeMins) {
            currentMins += 30;
            continue;
          }
          if (isTimeSlotValid(currentMins, requiredDuration, inventoryType)) {
            availableTimes.push(minsToTime(currentMins));
          }
          currentMins += 30;
        }
      });

      return availableTimes;
    },
    [timetable, isTimeSlotValid],
  );

  const availableStartTimes = useMemo(() => {
    return calculateAvailableStartTimes(formData.date, formData.duration || '60', formData.inventory || undefined);
  }, [calculateAvailableStartTimes, formData.date, formData.duration, formData.inventory]);

  const getMaxControllersForHardwareStep = (type: string) => {
    if (type === 'switch') return inventory['Nintendo Controllers'] || 0;
    return inventory.controller || 0;
  };

  const goToStep = (step: number) => {
    if (step < 1 || step > totalSteps) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.inventory) return false;
        if ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0) return false;
        return true;
      case 2:
        return !!formData.date && !!formData.startTime;
      case 3:
        return formData.acceptedTerms;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      goToStep(currentStep + 1);
    } else {
      const errors: string[] = [];
      if (currentStep === 1) {
        if (!formData.inventory) errors.push('Kies een platform');
        if ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0) errors.push('Kies aantal spelers');
      }
      if (currentStep === 2) {
        if (!formData.date) errors.push('Selecteer een datum');
        else if (!formData.startTime) errors.push('Selecteer een starttijd');
      }
      setError(errors.length > 0 ? errors.join(', ') : 'Vul alle velden in');
    }
  };

  const handleBack = () => {
    setError('');
    goToStep(currentStep - 1);
  };

  const handleLogout = async () => {
    try {
      await apiClient.POST('/auth/logout');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!formData.acceptedTerms) throw new Error('Je moet de huisregels accepteren.');
      if (!formData.inventory) throw new Error('Kies hardware.');

      const startMins = timeToMins(formData.startTime);
      const duration = parseInt(formData.duration || '60');
      const endMins = startMins + duration;

      const startISO = `${formData.date}T${formData.startTime}:00.000Z`;
      const endISO = `${formData.date}T${minsToTime(endMins)}:00.000Z`;

      const res = await apiClient.POST('/reservations', {
        body: {
          startTime: startISO,
          endTime: endISO,
          inventory: formData.inventory as 'pc' | 'ps5' | 'switch',
          controllers: formData.inventory === 'pc' && formData.extraController ? 1 : formData.controllers,
        },
      });

      if (res.error) throw new Error(getApiErrorMessage(res.error, 'Failed to create reservation'));
      if (!res.data) throw new Error('Failed to create reservation');

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reservatie mislukt');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className='min-h-screen pt-28 flex items-center justify-center'>
        <Loader2 className='animate-spin text-white' size={32} />
      </div>
    );
  }

  if (!profile) {
    return <SignInGate />;
  }

  if (success) {
    return (
      <div className='min-h-screen pt-20 flex items-center justify-center px-4 relative overflow-hidden'>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500 rounded-full blur-[150px] opacity-[0.05] pointer-events-none'></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className='bg-[#020618] border border-green-500/30 p-8 md:p-12 rounded-4xl text-center max-w-md w-full relative overflow-hidden shadow-2xl shadow-green-900/10'
        >
          <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500/50 to-transparent'></div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className='w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20'
          >
            <CheckCircle className='w-10 h-10 text-green-500' strokeWidth={2} />
          </motion.div>

          <h2 className='text-3xl font-bold tracking-tight text-white mb-3 relative z-10'>Reservatie Ontvangen!</h2>
          <p className='text-gray-400 mb-8 relative z-10 leading-relaxed'>
            Je hebt succesvol een slot geboekt. Check je mailbox voor de bevestiging en je QR code.
          </p>

          <button
            onClick={() => window.location.reload()}
            className='w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20'
          >
            Nieuwe Reservatie
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='min-h-screen pt-28 pb-12 px-4 md:px-6 relative overflow-hidden flex flex-col items-center justify-start'>
      <div className='fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#d42422] rounded-full blur-[180px] opacity-[0.08] pointer-events-none z-[-1]'></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='text-center mb-6 relative z-10'
      >
        <h1 className='text-4xl md:text-5xl font-bold tracking-tight text-white mb-3'>
          Reserveer <span className='text-[#d42422]'>Gear</span>
        </h1>
        <p className='text-gray-400 max-w-md mx-auto'>Boek een High-end PC of Console sessie.</p>
      </motion.div>

      <div className='w-full max-w-2xl mb-3 flex items-center justify-between text-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5'>
        <span className='text-gray-300 truncate'>
          Reserveren als <span className='text-white font-medium'>{profile.name || profile.email}</span>
          {profile.name && <span className='text-gray-500'> · {profile.email}</span>}
        </span>
        <button onClick={handleLogout} className='flex items-center gap-1.5 text-gray-400 hover:text-white text-xs shrink-0 ml-3'>
          <LogOut size={14} /> Uitloggen
        </button>
      </div>

      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        className='w-full max-w-2xl bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl relative overflow-hidden flex flex-col min-h-[580px]'
      >
        <div className='h-1 w-full bg-white/5 flex relative overflow-hidden'>
          <motion.div
            className='h-full bg-linear-to-r from-red-600 to-[#d42422] shadow-[0_0_10px_#d42422]'
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        <div className='p-6 md:p-10 flex-1 flex flex-col'>
          <div className='mb-6 flex items-center justify-between'>
            <motion.h2 key={currentStep} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className='text-2xl font-bold text-white tracking-tight'>
              {currentStep === 1 && 'Kies je hardware'}
              {currentStep === 2 && 'Wanneer wil je komen?'}
              {currentStep === 3 && 'Bevestigen'}
            </motion.h2>
            <span className='text-xs font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/5'>
              Stap {currentStep} <span className='text-gray-600'>/</span> {totalSteps}
            </span>
          </div>

          {error && <div className='bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-sm mb-4'>{error}</div>}

          <div className='relative flex-1'>
            <AnimatePresence initial={false} mode='wait' custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial='enter'
                animate='center'
                exit='exit'
                transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                className='absolute inset-0 overflow-y-auto custom-scrollbar pr-1 pb-2'
              >
                {currentStep === 1 && (
                  <StepHardware
                    data={formData}
                    updateData={updateFormData}
                    availability={{
                      pc: (inventory.pc || 0) > 0,
                      ps5: (inventory.ps5 || 0) > 0,
                      switch: (inventory.switch || 0) > 0,
                    }}
                    maxControllersFn={getMaxControllersForHardwareStep}
                  />
                )}
                {currentStep === 2 && <StepDateTime data={formData} updateData={updateFormData} availableStartTimes={availableStartTimes} timetable={timetable} />}
                {currentStep === 3 && <StepConfirmation data={formData} updateData={updateFormData} error={error} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className='p-6 md:px-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-between mt-auto backdrop-blur-sm'>
          <button
            onClick={handleBack}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium',
              currentStep === 1 && 'opacity-0 pointer-events-none',
            )}
          >
            <ChevronLeft size={18} /> Vorige
          </button>

          <div className='flex gap-4'>
            {currentStep < totalSteps && (
              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-95',
                  'bg-white text-black hover:bg-gray-100 shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                disabled={
                  (currentStep === 1 &&
                    (!formData.inventory || ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0))) ||
                  (currentStep === 2 && (!formData.date || !formData.startTime))
                }
              >
                Volgende <ChevronRight size={18} />
              </button>
            )}

            {currentStep === totalSteps && (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.acceptedTerms}
                className='flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-[#d42422] text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(212,36,34,0.4)] hover:shadow-[0_0_30px_rgba(212,36,34,0.6)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? <Clock className='animate-spin' size={20} /> : <CheckCircle size={20} />}
                {loading ? 'Bezig...' : 'Reserveren'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SignInGate() {
  const returnUrl = '/reservations';
  return (
    <div className='min-h-screen pt-28 pb-12 px-4 flex items-center justify-center'>
      <div className='w-full max-w-md bg-[#020618]/80 border border-white/10 rounded-3xl p-8 text-center shadow-2xl'>
        <h1 className='text-3xl font-bold text-white mb-2 tracking-tight'>
          Login om te <span className='text-[#d42422]'>reserveren</span>
        </h1>
        <p className='text-gray-400 text-sm mb-8'>Log in met je AP Microsoft-account om verder te gaan.</p>

        <a
          href={`/api/auth/microsoft/login?returnUrl=${encodeURIComponent(returnUrl)}`}
          className='flex items-center justify-center gap-3 w-full rounded-xl bg-white text-black hover:bg-gray-100 py-3 font-semibold transition-colors'
        >
          <svg width='18' height='18' viewBox='0 0 23 23' xmlns='http://www.w3.org/2000/svg'>
            <rect width='10' height='10' fill='#f25022' />
            <rect x='12' width='10' height='10' fill='#7fba00' />
            <rect y='12' width='10' height='10' fill='#00a4ef' />
            <rect x='12' y='12' width='10' height='10' fill='#ffb900' />
          </svg>
          Login met Microsoft
        </a>

        <p className='text-xs text-gray-500 mt-6'>Je gegevens worden enkel gebruikt voor de reservatie.</p>
      </div>
    </div>
  );
}
