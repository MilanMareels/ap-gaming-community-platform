'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Gamepad2,
  HelpCircle,
  History,
  Loader2,
  LogOut,
  Monitor,
  ShieldBan,
  Smile,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/api';
import type { AuthProfile, MyReservation, MyReservationsResponse } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { Pagination } from '@/components/ui/Pagination';
import { NoShowTracker } from '@/components/reservations/NoShowTracker';

/** "Now" in the fake-UTC convention used by stored reservation timestamps (local wall-clock stored as UTC). */
function nowAsFakeUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
}

const dateFormatter = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const timeFormatter = new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

const INVENTORY_LABELS: Record<string, string> = {
  pc: 'Gaming PC',
  ps5: 'PlayStation 5',
  switch: 'Nintendo Switch',
};

const HISTORY_PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  RESERVED: { label: 'Gereserveerd', className: 'bg-blue-500/10 text-blue-300 ring-blue-500/30' },
  PRESENT: { label: 'Aanwezig', className: 'bg-green-500/10 text-green-300 ring-green-500/30' },
  CANCELLED: { label: 'Geannuleerd', className: 'bg-white/5 text-gray-400 ring-white/15' },
  NO_SHOW: { label: 'No-show', className: 'bg-red-500/10 text-red-300 ring-red-500/30' },
};

export default function ProfilePage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [data, setData] = useState<MyReservationsResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [historyPage, setHistoryPage] = useState(1);

  const loadReservations = useCallback(async () => {
    const res = await apiClient.GET('/reservations/me', {});
    if (res.data) {
      setData(res.data);
      setLoadError('');
    } else {
      setLoadError(getApiErrorMessage(res.error, 'Kon je reservaties niet laden.'));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.GET('/auth/profile', {});
        if (res.data) {
          setProfile(res.data);
          await loadReservations();
        }
      } catch {
        // Treat as unauthenticated
      } finally {
        setAuthLoading(false);
      }
    };
    load();
  }, [loadReservations]);

  const { upcoming, history } = useMemo(() => {
    const now = nowAsFakeUTC();
    const all = data?.reservations ?? [];
    const isActive = (r: MyReservation) => (r.status === 'RESERVED' || r.status === 'PRESENT') && new Date(r.endTime) > now;
    return {
      // Soonest first for upcoming, most recent first for history
      upcoming: all.filter(isActive).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      history: all.filter((r) => !isActive(r)),
    };
  }, [data]);

  const handleLogout = async () => {
    try {
      await apiClient.POST('/auth/logout');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (!profile) {
    return <SignInGate />;
  }

  const displayName = profile.name || profile.email;
  // History keeps growing, so it's paged; upcoming is short (reservations are at most a few days ahead)
  const historyTotalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const visible = tab === 'upcoming' ? upcoming : history.slice((currentHistoryPage - 1) * HISTORY_PAGE_SIZE, currentHistoryPage * HISTORY_PAGE_SIZE);

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 md:px-6 relative overflow-hidden">
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#d42422] rounded-full blur-[180px] opacity-[0.07] pointer-events-none z-[-1]" />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5"
        >
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-[#d42422] flex items-center justify-center text-3xl font-black text-white shadow-[0_0_25px_rgba(212,36,34,0.4)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white truncate">{displayName}</h1>
            <p className="text-gray-400 text-sm truncate">
              {profile.email}
              {profile.sNumber && profile.sNumber !== 'N/A' && <span className="text-gray-500"> · {profile.sNumber}</span>}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start sm:self-center flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-4 py-2 transition-colors"
          >
            <LogOut size={16} /> Uitloggen
          </button>
        </motion.div>

        {data && <NoShowStatus data={data} />}

        {/* Reservations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10 self-start">
              <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')} icon={<CalendarClock size={16} />}>
                Komende ({upcoming.length})
              </TabButton>
              <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<History size={16} />}>
                Geschiedenis ({history.length})
              </TabButton>
            </div>
            {!data?.isBlocked && (
              <Link
                href="/reservations"
                className="inline-flex items-center justify-center gap-2 bg-[#d42422] hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(212,36,34,0.35)] active:scale-95"
              >
                <CalendarPlus size={18} /> Nieuwe reservatie
              </Link>
            )}
          </div>

          {loadError && <p className="text-red-400 text-sm mb-4">{loadError}</p>}

          <AnimatePresence mode="popLayout" initial={false}>
            {visible.length === 0 ? (
              <motion.div
                key={`empty-${tab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 text-gray-400"
              >
                <Gamepad2 className="mx-auto mb-3 text-gray-600" size={40} strokeWidth={1.5} />
                {tab === 'upcoming' ? 'Je hebt geen komende reservaties.' : 'Je hebt nog geen eerdere reservaties.'}
              </motion.div>
            ) : (
              <motion.ul
                key={`list-${tab}-${tab === 'history' ? currentHistoryPage : 0}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {visible.map((reservation, i) => (
                  <ReservationCard key={reservation.cuid} reservation={reservation} index={i} onCancelled={loadReservations} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {tab === 'history' && <Pagination currentPage={currentHistoryPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />}
        </motion.div>

        <Link
          href="/reservations/how-to-cancel"
          className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <HelpCircle size={16} /> Hoe werkt annuleren en wat is een no-show?
        </Link>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}
    >
      {active && (
        <motion.span
          layoutId="profile-tab"
          className="absolute inset-0 bg-[#d42422] rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}

function NoShowStatus({ data }: { data: MyReservationsResponse }) {
  const { noShowCount, noShowLimit, isBlocked } = data;
  const remaining = Math.max(0, noShowLimit - noShowCount);

  const state = isBlocked
    ? {
        icon: <ShieldBan className="text-red-400" size={22} />,
        title: 'Je kan momenteel niet reserveren',
        text: `Je hebt ${noShowCount} no-shows. Spreek een medewerker aan in de Gaming Hub of contacteer ons via Discord om dit te bespreken.`,
        border: 'border-red-500/40',
      }
    : noShowCount === 0
      ? {
          icon: <Smile className="text-green-400" size={22} />,
          title: 'Geen no-shows, top!',
          text: 'Kan je toch niet komen? Annuleer dan op tijd, dan telt het niet mee.',
          border: 'border-white/10',
        }
      : {
          icon: <AlertTriangle className={noShowCount === 1 ? 'text-yellow-400' : 'text-orange-400'} size={22} />,
          title: `Nog ${remaining} no-show${remaining === 1 ? '' : 's'} tot je niet meer kan reserveren`,
          text: 'Annuleer je reservatie altijd op voorhand als je niet kan komen. Annuleren telt niet als no-show.',
          border: noShowCount === 1 ? 'border-yellow-500/30' : 'border-orange-500/40',
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`bg-[#020618]/80 backdrop-blur-xl border ${state.border} rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {state.icon}
          <h2 className="text-lg font-semibold text-white">{state.title}</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">{state.text}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NoShowTracker count={noShowCount} limit={noShowLimit} size={40} />
        <span className="text-xs uppercase tracking-wider text-gray-500">No-shows</span>
      </div>
    </motion.div>
  );
}

function ReservationCard({ reservation, index, onCancelled }: { reservation: MyReservation; index: number; onCancelled: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const canCancel = reservation.status === 'RESERVED' && start > nowAsFakeUTC();
  const status = STATUS_STYLES[reservation.status] ?? STATUS_STYLES.RESERVED;
  const Icon = reservation.inventory === 'pc' ? Monitor : Gamepad2;

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    const res = await apiClient.PATCH('/reservations/me/{cuid}/cancel', { params: { path: { cuid: reservation.cuid } } });
    if (res.error) {
      setError(getApiErrorMessage(res.error, 'Annuleren is mislukt.'));
      setCancelling(false);
      return;
    }
    await onCancelled();
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#d42422]">
            <Icon size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{INVENTORY_LABELS[reservation.inventory] ?? reservation.inventory}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-gray-300 text-sm first-letter:uppercase">{dateFormatter.format(start)}</p>
            <p className="text-gray-400 text-sm">
              {timeFormatter.format(start)} – {timeFormatter.format(end)}
              {reservation.controllers > 0 && (
                <span className="text-gray-500">
                  {' '}
                  · {reservation.controllers} controller{reservation.controllers === 1 ? '' : 's'}
                </span>
              )}
            </p>
          </div>
        </div>

        {canCancel && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="shrink-0 self-start sm:self-auto ml-16 sm:ml-0 flex items-center gap-1.5 text-sm text-gray-300 hover:text-white border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 rounded-full px-3 py-1.5 transition-colors"
          >
            <XCircle size={16} /> Annuleren
          </button>
        )}
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-gray-300 flex-1">Zeker dat je deze reservatie wilt annuleren? Je plek gaat dan naar iemand anders.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-full text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                >
                  Behouden
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-full text-sm bg-[#d42422] hover:bg-red-700 text-white font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-70"
                >
                  {cancelling && <Loader2 size={14} className="animate-spin" />}
                  Ja, annuleer
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function SignInGate() {
  return (
    <div className="min-h-screen pt-28 pb-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#020618]/80 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Login voor je <span className="text-[#d42422]">profiel</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Bekijk en annuleer je reservaties nadat je bent ingelogd.</p>
        <Link
          href={`/login?returnUrl=${encodeURIComponent('/profile')}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-black hover:bg-gray-100 py-3 font-semibold transition-colors"
        >
          Inloggen <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
