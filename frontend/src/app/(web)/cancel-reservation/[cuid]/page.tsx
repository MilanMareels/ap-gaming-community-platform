'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { CheckCircle, AlertTriangle, Loader2, XCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, type: 'spring' as const } },
};

export default function CancelReservationPage() {
  const params = useParams();
  const cuid = params.cuid as string;

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already-cancelled'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCancel = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await apiClient.PATCH('/reservations/cancel/{cuid}', {
        params: {
          path: {
            cuid: cuid,
          },
        },
      });

      if (res.error) {
        const errMsg = getApiErrorMessage(res.error, 'Er is iets misgegaan bij het annuleren.');

        if (errMsg === 'Reservation is already cancelled') {
          setStatus('already-cancelled');
          return;
        }

        throw new Error(errMsg);
      }

      setStatus('success');
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Kon reservatie niet annuleren');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen pb-12 px-4 md:px-6 relative overflow-hidden flex flex-col items-center justify-center">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d42422] rounded-full blur-[180px] opacity-[0.06] pointer-events-none z-[-1]" />

      {status === 'idle' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent" />

          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20"
            >
              <AlertTriangle className="w-10 h-10 text-red-500" strokeWidth={2} />
            </motion.div>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
              Reservatie <span className="text-[#d42422]">Annuleren</span>
            </h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Weet je zeker dat je jouw reservatie wilt annuleren? Deze actie kan niet ongedaan worden gemaakt en je verliest je tijdslot.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCancel}
                className="w-full py-4 rounded-xl font-semibold bg-[#d42422] text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(212,36,34,0.4)] hover:shadow-[0_0_30px_rgba(212,36,34,0.6)] active:scale-95"
              >
                Ja, annuleer reservatie
              </button>
              <Link
                href="/reservations"
                className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20 text-center"
              >
                Nee, behoud reservatie
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {status === 'loading' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl relative overflow-hidden"
        >
          <div className="p-8 md:p-10 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20">
              <Loader2 className="w-10 h-10 text-[#d42422] animate-spin" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Bezig met annuleren...</h2>
            <p className="text-gray-400 leading-relaxed">Even geduld aub.</p>
          </div>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-green-500/30 rounded-4xl shadow-2xl shadow-green-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500/50 to-transparent" />

          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20"
            >
              <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={2} />
            </motion.div>

            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Succesvol geannuleerd!</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Je reservatie is geannuleerd. Bedankt dat je het ons hebt laten weten, we hebben je plekje vrijgegeven voor iemand anders.
            </p>

            <Link
              href="/reservations"
              className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20 text-center"
            >
              Terug naar reservaties
            </Link>
          </div>
        </motion.div>
      )}

      {status === 'already-cancelled' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-blue-500/30 rounded-4xl shadow-2xl shadow-blue-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500/50 to-transparent" />

          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20"
            >
              <Info className="w-10 h-10 text-blue-400" strokeWidth={2} />
            </motion.div>

            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Al geannuleerd</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Geen zorgen, deze reservatie was al eerder geannuleerd. Je hoeft verder niets meer te doen!
            </p>

            <Link
              href="/reservations"
              className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20 text-center"
            >
              Terug naar reservaties
            </Link>
          </div>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-red-500/30 rounded-4xl shadow-2xl shadow-red-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent" />

          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20"
            >
              <XCircle className="w-10 h-10 text-red-500" strokeWidth={2} />
            </motion.div>

            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Oeps, dat ging mis</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">{errorMessage}</p>

            <Link
              href="/reservations"
              className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 hover:border-white/20 text-center"
            >
              Ga terug
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
