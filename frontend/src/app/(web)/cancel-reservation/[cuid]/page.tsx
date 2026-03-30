'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { CheckCircle, AlertTriangle, Loader2, XCircle, Info } from 'lucide-react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-950 py-24 px-4 text-white flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl text-center">
        {status === 'idle' && (
          <>
            <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-black mb-4">
              RESERVATIE <span className="text-red-600">ANNULEREN</span>
            </h1>
            <p className="text-gray-400 mb-8">
              Weet je zeker dat je jouw reservatie wilt annuleren? Deze actie kan niet ongedaan worden gemaakt en je verliest je tijdslot.
            </p>
            <div className="space-y-3">
              <button onClick={handleCancel} className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors">
                JA, ANNULEER RESERVATIE
              </button>
              <Link
                href="/reservations"
                className="block w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-colors"
              >
                NEE, BEHOUD RESERVATIE
              </Link>
            </div>
          </>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Bezig met annuleren...</h2>
            <p className="text-gray-400 mt-2">Even geduld aub.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Succesvol geannuleerd!</h2>
            <p className="text-gray-400 mb-8">
              Je reservatie is geannuleerd. Bedankt dat je het ons hebt laten weten, we hebben je plekje vrijgegeven voor iemand anders.
            </p>
            <Link href="/reservations" className="text-red-500 hover:text-white underline font-medium transition-colors">
              Terug naar reservaties
            </Link>
          </div>
        )}

        {status === 'already-cancelled' && (
          <div className="py-4">
            <Info className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Al geannuleerd</h2>
            <p className="text-gray-400 mb-8">Geen zorgen, deze reservatie was al eerder geannuleerd. Je hoeft verder niets meer te doen!</p>
            <Link href="/reservations" className="text-red-500 hover:text-white underline font-medium transition-colors">
              Terug naar reservaties
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Oeps, dat ging mis</h2>
            <p className="text-gray-400 mb-8">{errorMessage}</p>
            <Link href="/reservations" className="text-red-500 hover:text-white underline font-medium transition-colors">
              Ga terug
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
