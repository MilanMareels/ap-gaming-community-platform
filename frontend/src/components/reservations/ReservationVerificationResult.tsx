'use client';

import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
import type { VerifiedReservation, VerificationStatus } from './types';

interface ReservationVerificationResultProps {
  status: VerificationStatus;
  reservation: VerifiedReservation | null;
  errorMessage?: string;
}

const formatDateTime = (isoDate: string) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
};

const inventoryLabel = (inventory: string) => {
  const map: Record<string, string> = {
    pc: 'PC',
    ps5: 'PlayStation 5',
    switch: 'Nintendo Switch',
  };

  return map[inventory] ?? inventory;
};

export function ReservationVerificationResult({
  status,
  reservation,
  errorMessage,
}: ReservationVerificationResultProps) {
  if (status === 'idle') return null;

  if (status === 'loading') {
    return (
      <div className='mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-300'>
        Reservatie wordt gecontroleerd...
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className='mt-6 rounded-2xl border border-red-700/50 bg-red-950/30 p-4 text-red-200'>
        <div className='flex items-center gap-2 font-semibold'>
          <XCircle className='h-5 w-5' /> Reservatie niet gevonden
        </div>
        <p className='mt-1 text-sm'>
          De QR code is ongeldig of de reservatie is niet meer actief.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className='mt-6 rounded-2xl border border-amber-600/40 bg-amber-900/20 p-4 text-amber-100'>
        {errorMessage ?? 'Er ging iets mis tijdens het valideren.'}
      </div>
    );
  }

  if (status === 'found' && reservation) {
    return (
      <div className='mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 md:p-6'>
        <div className='mb-4 flex items-center gap-2 text-emerald-300 font-semibold'>
          <CheckCircle2 className='h-5 w-5' /> Geldige reservatie
        </div>

        <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-2'>
          <div className='rounded-xl border border-slate-700 bg-slate-900 p-3'>
            <p className='text-xs uppercase text-slate-400'>S-Nummer</p>
            <p className='font-semibold text-white'>{reservation.sNumber}</p>
          </div>
          <div className='rounded-xl border border-slate-700 bg-slate-900 p-3'>
            <p className='text-xs uppercase text-slate-400'>Email</p>
            <p className='font-semibold text-white break-all'>{reservation.email}</p>
          </div>
          <div className='rounded-xl border border-slate-700 bg-slate-900 p-3'>
            <p className='text-xs uppercase text-slate-400'>Hardware</p>
            <p className='font-semibold text-white'>
              {inventoryLabel(reservation.inventory)}
            </p>
          </div>
          <div className='rounded-xl border border-slate-700 bg-slate-900 p-3'>
            <p className='text-xs uppercase text-slate-400'>Controllers</p>
            <p className='font-semibold text-white'>{reservation.controllers}</p>
          </div>
          <div className='rounded-xl border border-slate-700 bg-slate-900 p-3 md:col-span-2'>
            <p className='mb-1 text-xs uppercase text-slate-400'>Tijdslot</p>
            <p className='flex items-center gap-2 font-semibold text-white'>
              <Calendar className='h-4 w-4 text-emerald-300' />
              {formatDateTime(reservation.startTime)} -{' '}
              {formatDateTime(reservation.endTime)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
