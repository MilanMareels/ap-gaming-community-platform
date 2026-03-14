'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { ReservationWithUser } from '@/api';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, modal is in edit mode for this reservation */
  reservation?: ReservationWithUser | null;
}

const INVENTORY_OPTIONS = [
  { value: 'pc', label: 'PC' },
  { value: 'ps5', label: 'PS5' },
  { value: 'switch', label: 'Switch' },
];

const CONTROLLER_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

/** Parse an ISO date-time to a date string (YYYY-MM-DD) */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse an ISO date-time to a time string (HH:mm) */
function toTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function ReservationModal({
  open,
  onClose,
  onSaved,
  reservation,
}: ReservationModalProps) {
  const isEdit = !!reservation;

  const [email, setEmail] = useState('');
  const [sNumber, setSNumber] = useState('');
  const [inventory, setInventory] = useState('pc');
  const [controllers, setControllers] = useState('0');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate form when opening in edit mode
  useEffect(() => {
    if (reservation) {
      setEmail(reservation.email);
      setSNumber(reservation.user?.sNumber || '');
      setInventory(reservation.inventory);
      setControllers(String(reservation.controllers));
      setDate(toDateInput(reservation.startTime));
      setStartTime(toTimeInput(reservation.startTime));
      setEndTime(toTimeInput(reservation.endTime));
    } else {
      // Reset for create mode
      setEmail('');
      setSNumber('');
      setInventory('pc');
      setControllers('0');
      setDate('');
      setStartTime('');
      setEndTime('');
    }
    setError('');
  }, [reservation, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !date || !startTime || !endTime) {
      setError('Vul alle verplichte velden in.');
      return;
    }

    const startISO = `${date}T${startTime}:00.000Z`;
    const endISO = `${date}T${endTime}:00.000Z`;

    if (startISO >= endISO) {
      setError('Eindtijd moet na starttijd liggen.');
      return;
    }

    setSaving(true);

    try {
      if (isEdit && reservation) {
        // Update existing reservation
        await apiClient.PATCH('/reservations/{id}', {
          params: { path: { id: reservation.id.toString() } },
          body: {
            email,
            sNumber: sNumber || undefined,
            inventory: inventory as 'pc' | 'ps5' | 'switch',
            controllers: Number(controllers),
            startTime: startISO,
            endTime: endISO,
          },
        });
      } else {
        // Create new admin reservation
        await apiClient.POST('/reservations/admin', {
          body: {
            email,
            sNumber: sNumber || undefined,
            inventory: inventory as 'pc' | 'ps5' | 'switch',
            controllers: Number(controllers),
            startTime: startISO,
            endTime: endISO,
          },
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Er is een fout opgetreden.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-slate-800'>
          <h2 className='text-xl font-black text-white'>
            {isEdit ? 'Reservering Bewerken' : 'Nieuwe Reservering'}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <Input
            label='E-mailadres *'
            type='email'
            placeholder='student@student.ap.be'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label='S-nummer (optioneel)'
            type='text'
            placeholder='s123456'
            value={sNumber}
            onChange={(e) => setSNumber(e.target.value)}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Select
              label='Hardware *'
              options={INVENTORY_OPTIONS}
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
            />
            <Select
              label='Controllers'
              options={CONTROLLER_OPTIONS}
              value={controllers}
              onChange={(e) => setControllers(e.target.value)}
            />
          </div>

          <Input
            label='Datum *'
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Input
              label='Starttijd *'
              type='time'
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <Input
              label='Eindtijd *'
              type='time'
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {error && (
            <div className='bg-red-900/20 border border-red-900 rounded-xl p-3 text-sm text-red-400'>
              {error}
            </div>
          )}

          <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
            <Button
              type='button'
              variant='secondary'
              onClick={onClose}
              className='flex-1'
            >
              Annuleren
            </Button>
            <Button
              type='submit'
              variant='primary'
              disabled={saving}
              className='flex-1'
            >
              {saving
                ? 'Opslaan...'
                : isEdit
                  ? 'Wijzigingen Opslaan'
                  : 'Reservering Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
