'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiClient } from '@/api';
import type { TimeTableEntry, ReservationSlot, Setting } from '@/api';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Sub-components
import { StepIdentity } from './_components/StepIdentity';
import { StepDateTime } from './_components/StepDateTime';
import { StepHardware } from './_components/StepHardware';
import { StepConfirmation } from './_components/StepConfirmation';
import type { ReservationFormData } from './_components/types';

// --- Types ---
// Removed local interface definition in favor of import

// --- Utility Functions ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert ISO datetime or HH:mm string to minutes since midnight */
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

// --- Animations ---
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

// --- Main Component ---

export default function ReservationsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Data State
  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);
  const [existingReservations, setExistingReservations] = useState<ReservationSlot[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({
    pc: 5,
    ps5: 1,
    switch: 1,
    controller: 8,
    'Nintendo Controllers': 4,
  });

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const totalSteps = 4;

  const [formData, setFormData] = useState<ReservationFormData>({
    sNumber: '',
    name: '',
    email: '',
    inventory: '',
    date: '',
    startTime: '',
    duration: '60',
    controllers: 0,
    extraController: false,
    acceptedTerms: false,
  });

  const updateFormData = (updates: Partial<ReservationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // --- Data Fetching ---

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
            setInventory((prev) => ({ ...prev, ...inventorySettings }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, []);

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

  // --- Logic ---

  // Check if ANY hardware is available at a given time slot (used for Time Grid)
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

      if (checkInventoryType) {
        return checkType(checkInventoryType);
      }

      return checkType('pc') || checkType('ps5') || checkType('switch');
    },
    [existingReservations, inventory],
  );

  const calculateAvailableStartTimes = useCallback(
    (date: string, duration: string) => {
      if (!date) return [];

      const dateObj = new Date(date + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();
      const daySchedule = timetable.filter((entry) => entry.dayOfWeek === dayOfWeek && entry.type === 'OPEN');

      if (daySchedule.length === 0) return [];

      const availableTimes: string[] = [];
      const requiredDuration = parseInt(duration);

      const now = new Date();
      // Format local date as YYYY-MM-DD to match the picker
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

          if (isTimeSlotValid(currentMins, requiredDuration)) {
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
    return calculateAvailableStartTimes(formData.date, formData.duration || '60');
  }, [calculateAvailableStartTimes, formData.date, formData.duration]);

  // Specific hardware availability check used in StepHardware
  const getHardwareAvailability = (type: string) => {
    if (!formData.date || !formData.startTime) return false;
    const startMins = timeToMins(formData.startTime);
    const duration = parseInt(formData.duration);
    return isTimeSlotValid(startMins, duration, type);
  };

  const getMaxControllers = (type: string) => {
    if (!formData.date || !formData.startTime) return 0;
    const startMins = timeToMins(formData.startTime);
    const duration = parseInt(formData.duration);
    const endMins = startMins + duration;

    let maxPool = 0;
    let usedPool = 0;

    if (type === 'switch') {
      maxPool = inventory['Nintendo Controllers'] || 0;
      usedPool = existingReservations
        .filter((r) => r.inventory === 'switch' && timeToMins(r.startTime) < endMins && timeToMins(r.endTime) > startMins)
        .reduce((sum, r) => sum + (r.controllers || 0), 0);
    } else {
      maxPool = inventory.controller || 0;
      usedPool = existingReservations
        .filter((r) => r.inventory !== 'switch' && timeToMins(r.startTime) < endMins && timeToMins(r.endTime) > startMins)
        .reduce((sum, r) => sum + (r.controllers || 0), 0);
    }

    return Math.max(0, maxPool - usedPool);
  };

  // --- Step Navigation ---

  const goToStep = (step: number) => {
    if (step < 1 || step > totalSteps) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!/^s[0-9]+$/.test(formData.sNumber.toLowerCase())) return false;
        if (!formData.email.endsWith('@student.ap.be')) return false;
        return true;
      case 2:
        return !!formData.date && !!formData.startTime;
      case 3:
        if (!formData.inventory) return false;
        if ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0) return false;
        return true;
      case 4:
        return formData.acceptedTerms;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      goToStep(currentStep + 1);
    } else {
      const errors = [];
      if (currentStep === 1) {
        if (!/^s[0-9]+$/.test(formData.sNumber.toLowerCase())) errors.push('Gebruik een geldig s-nummer (s123...)');
        if (!formData.email.endsWith('@student.ap.be')) errors.push('Gebruik je AP studenten email');
      }
      if (currentStep === 2) {
        if (!formData.date) errors.push('Selecteer een datum');
        else if (!formData.startTime) errors.push('Selecteer een starttijd');
      }
      if (currentStep === 3) {
        if (!formData.inventory) errors.push('Kies een platform');
        if ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0) errors.push('Kies aantal spelers');
      }
      if (errors.length > 0) setError(errors.join(', '));
      else setError('Vul alle velden in');
    }
  };

  const handleBack = () => {
    setError('');
    goToStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!formData.acceptedTerms) {
        throw new Error('Je moet de huisregels accepteren.');
      }

      const startMins = timeToMins(formData.startTime);
      const duration = parseInt(formData.duration || '60');
      const endMins = startMins + duration;

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

      if (res.error) {
        throw new Error((res.error as any).message || 'Reservatie mislukt');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reservatie mislukt');
    } finally {
      setLoading(false);
    }
  };

  // --- Final Success View ---
  if (success) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500 rounded-full blur-[150px] opacity-[0.05] pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="bg-[#020618] border border-green-500/30 p-8 md:p-12 rounded-4xl text-center max-w-md w-full relative overflow-hidden shadow-2xl shadow-green-900/10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500/50 to-transparent"></div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20"
          >
            <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={2} />
          </motion.div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-3 relative z-10">Reservatie Ontvangen!</h2>
          <p className="text-gray-400 mb-8 relative z-10 leading-relaxed">
            Je hebt succesvol een slot geboekt. Check je mailbox voor de bevestiging en je QR code.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20"
          >
            Nieuwe Reservatie
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="min-h-screen pt-28 pb-12 px-4 md:px-6 relative overflow-hidden flex flex-col items-center justify-start">
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#d42422] rounded-full blur-[180px] opacity-[0.08] pointer-events-none z-[-1]"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 relative z-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
          Reserveer <span className="text-[#d42422]">Gear</span>
        </h1>
        <p className="text-gray-400 max-w-md mx-auto">Boek een High-end PC of Console sessie.</p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl relative overflow-hidden flex flex-col min-h-[580px]"
      >
        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/5 flex relative overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-red-600 to-[#d42422] shadow-[0_0_10px_#d42422]"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-10 flex-1 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <motion.h2
              key={currentStep}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-white tracking-tight"
            >
              {currentStep === 1 && 'Start'}
              {currentStep === 2 && 'Wanneer wil je komen?'}
              {currentStep === 3 && 'Kies je hardware'}
              {currentStep === 4 && 'Bevestigen'}
            </motion.h2>
            <span className="text-xs font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/5">
              Stap {currentStep} <span className="text-gray-600">/</span> {totalSteps}
            </span>
          </div>

          <div className="relative flex-1">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0 overflow-y-auto custom-scrollbar pr-1 pb-2"
              >
                {currentStep === 1 && <StepIdentity data={formData} updateData={updateFormData} setError={setError} error={error} />}
                {currentStep === 2 && (
                  <StepDateTime data={formData} updateData={updateFormData} availableStartTimes={availableStartTimes} timetable={timetable} />
                )}
                {currentStep === 3 && (
                  <StepHardware
                    data={formData}
                    updateData={updateFormData}
                    availability={{
                      pc: getHardwareAvailability('pc'),
                      ps5: getHardwareAvailability('ps5'),
                      switch: getHardwareAvailability('switch'),
                    }}
                    maxControllersFn={getMaxControllers}
                  />
                )}
                {currentStep === 4 && <StepConfirmation data={formData} updateData={updateFormData} error={error} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 md:px-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-between mt-auto backdrop-blur-sm">
          <button
            onClick={handleBack}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium',
              currentStep === 1 && 'opacity-0 pointer-events-none',
            )}
          >
            <ChevronLeft size={18} /> Vorige
          </button>

          <div className="flex gap-4">
            {currentStep < totalSteps && (
              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-95',
                  'bg-white text-black hover:bg-gray-100 shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                disabled={
                  (currentStep === 1 && (!formData.sNumber || !formData.email)) ||
                  (currentStep === 2 && (!formData.date || !formData.startTime)) ||
                  (currentStep === 3 &&
                    (!formData.inventory || ((formData.inventory === 'ps5' || formData.inventory === 'switch') && formData.controllers === 0)))
                }
              >
                Volgende <ChevronRight size={18} />
              </button>
            )}

            {currentStep === totalSteps && (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.acceptedTerms}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-[#d42422] text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(212,36,34,0.4)] hover:shadow-[0_0_30px_rgba(212,36,34,0.6)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Clock className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {loading ? 'Bezig...' : 'Reserveren'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
