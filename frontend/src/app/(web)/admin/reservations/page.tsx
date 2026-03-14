'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  Check,
  UserX,
  Gamepad2,
  Plus,
  Pencil,
  Ban,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { apiClient } from '@/api';
import type { ReservationWithUser, ReservationStatus } from '@/api';
import ReservationModal from './ReservationModal';
import ReservationQrScannerModal from '@/components/reservations/ReservationQrScannerModal';

const ITEMS_PER_PAGE = 10;

/** Extract date (YYYY-MM-DD) from an ISO datetime string */
function dateFromISO(iso: string): string {
  return iso.slice(0, 10);
}

/** Format an ISO datetime string to HH:mm */
function formatTime(iso: string): string {
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return d.toISOString().slice(11, 16);
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithUser[]>([]);
  const [filterDate, setFilterDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<ReservationWithUser | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  async function fetchReservations() {
    try {
      const res = await apiClient.GET('/reservations', {});
      if (res.data) setReservations(res.data as ReservationWithUser[]);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    }
  }

  useEffect(() => {
    fetchReservations();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, searchQuery]);

  const handleUpdateStatus = async (id: number, status: ReservationStatus) => {
    try {
      await apiClient.PATCH('/reservations/{id}/status', {
        params: { path: { id: id.toString() } },
        body: { status },
      });
      await fetchReservations();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    try {
      await apiClient.DELETE('/reservations/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchReservations();
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze reservering wilt annuleren?'))
      return;
    try {
      await apiClient.PATCH('/reservations/{id}/status', {
        params: { path: { id: id.toString() } },
        body: { status: 'CANCELLED' },
      });
      await fetchReservations();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
    }
  };

  const openCreateModal = () => {
    setEditingReservation(null);
    setModalOpen(true);
  };

  const openEditModal = (r: ReservationWithUser) => {
    setEditingReservation(r);
    setModalOpen(true);
  };

  const sorted = [...reservations].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  const filtered = sorted.filter((r) => {
    if (filterDate && dateFromISO(r.startTime) !== filterDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesEmail = r.email.toLowerCase().includes(q);
      const matchesName = r.user?.name?.toLowerCase().includes(q);
      const matchesSNumber = r.user?.sNumber?.toLowerCase().includes(q);
      if (!matchesEmail && !matchesName && !matchesSNumber) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const renderStatusBadge = (status: ReservationStatus) => {
    if (status === 'PRESENT') return <Badge variant='success'>Aanwezig</Badge>;
    if (status === 'NO_SHOW') return <Badge variant='danger'>Afwezig</Badge>;
    if (status === 'CANCELLED')
      return <Badge variant='warning'>Geannuleerd</Badge>;
    return <Badge variant='warning'>Geboekt</Badge>;
  };

  return (
    <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden'>
      <div className='border-b border-slate-800 bg-slate-950 p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button size='sm' variant='primary' onClick={openCreateModal}>
              <Plus size={16} /> Nieuwe Reservering
            </Button>
            <Button
              size='sm'
              variant='secondary'
              onClick={() => setScannerOpen(true)}
            >
              <QrCode size={16} /> Verifieer QR
            </Button>
            <div className='text-xs uppercase tracking-wide text-gray-500 lg:ml-2'>
              {filtered.length} resultaten
            </div>
          </div>

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-end lg:gap-3'>
            <div className='sm:min-w-44'>
              <label className='mb-1 block text-xs font-bold uppercase text-gray-500'>
                Filter op datum
              </label>
              <input
                type='date'
                className='w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white [&::-webkit-calendar-picker-indicator]:invert'
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className='sm:min-w-72 lg:min-w-96'>
              <label className='mb-1 block text-xs font-bold uppercase text-gray-500'>
                Zoeken
              </label>
              <input
                type='text'
                placeholder='Zoek op Email of S-nummer'
                className='w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className='self-end pb-1'>
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className='text-xs text-red-500 hover:underline'
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-3 p-3 md:hidden'>
        {paginated.map((r) => (
          <div
            key={r.id}
            className='rounded-xl border border-slate-800 bg-slate-950 p-3'
          >
            <div className='mb-2 flex items-start justify-between gap-2'>
              <div>
                <p className='font-bold text-white'>
                  {r.user?.name || 'Unknown'}
                </p>
                <p className='text-xs text-gray-400'>{r.email}</p>
                {r.user?.sNumber && (
                  <p className='text-xs text-gray-500'>{r.user.sNumber}</p>
                )}
              </div>
              {renderStatusBadge(r.status)}
            </div>

            <div className='mb-3 grid grid-cols-2 gap-2 text-xs text-gray-300'>
              <div className='rounded-lg border border-slate-800 bg-slate-900 p-2'>
                <p className='text-gray-500'>Datum</p>
                <p className='font-semibold text-white'>
                  {dateFromISO(r.startTime)}
                </p>
              </div>
              <div className='rounded-lg border border-slate-800 bg-slate-900 p-2'>
                <p className='text-gray-500'>Tijd</p>
                <p className='font-semibold text-white'>
                  {formatTime(r.startTime)} - {formatTime(r.endTime)}
                </p>
              </div>
              <div className='col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-2'>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant={
                      r.inventory === 'pc' || r.inventory === 'switch'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {r.inventory.toUpperCase()}
                  </Badge>
                  {r.controllers > 0 && (
                    <span className='text-xs text-gray-400'>
                      <Gamepad2 className='inline' size={12} /> {r.controllers}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              {r.status === 'RESERVED' && (
                <>
                  <Button
                    size='sm'
                    variant='success'
                    onClick={() => handleUpdateStatus(r.id, 'PRESENT')}
                    title='Markeer als aanwezig'
                  >
                    <Check size={16} /> Aanwezig
                  </Button>
                  <Button
                    size='sm'
                    variant='danger'
                    onClick={() => handleUpdateStatus(r.id, 'NO_SHOW')}
                    title='Markeer als no-show'
                  >
                    <UserX size={16} /> No-show
                  </Button>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() => handleCancel(r.id)}
                    title='Annuleer reservering'
                  >
                    <Ban size={16} /> Annuleer
                  </Button>
                </>
              )}
              <Button
                size='sm'
                variant='secondary'
                onClick={() => openEditModal(r)}
                title='Bewerk reservering'
              >
                <Pencil size={16} /> Bewerk
              </Button>
              <Button
                size='sm'
                variant='danger'
                onClick={() => handleDelete(r.id)}
                title='Verwijder reservering'
              >
                <Trash2 size={16} /> Verwijder
              </Button>
            </div>
          </div>
        ))}

        {paginated.length === 0 && (
          <div className='rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-gray-500'>
            Geen reserveringen gevonden.
          </div>
        )}
      </div>

      <div className='hidden overflow-x-auto md:block'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-slate-950 text-gray-500 uppercase'>
            <tr>
              <th className='p-4'>Student</th>
              <th className='p-4'>Datum</th>
              <th className='p-4'>Tijd</th>
              <th className='p-4'>Hardware</th>
              <th className='p-4'>Status</th>
              <th className='p-4 text-right'>Actie</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-800'>
            {paginated.map((r) => (
              <tr key={r.id}>
                <td className='p-4 font-bold'>
                  {r.user?.name || 'Unknown'}
                  <div className='text-xs text-gray-500 font-normal'>
                    {r.email}
                    {r.user?.sNumber && (
                      <span className='ml-2 text-gray-600'>
                        ({r.user.sNumber})
                      </span>
                    )}
                  </div>
                </td>
                <td className='p-4'>{dateFromISO(r.startTime)}</td>
                <td className='p-4'>
                  {formatTime(r.startTime)} - {formatTime(r.endTime)}
                </td>
                <td className='p-4'>
                  <Badge
                    variant={
                      r.inventory === 'pc' || r.inventory === 'switch'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {r.inventory.toUpperCase()}
                  </Badge>
                  {r.controllers > 0 && (
                    <span className='ml-2 text-xs text-gray-400'>
                      <Gamepad2 className='inline' size={12} /> {r.controllers}
                    </span>
                  )}
                </td>
                <td className='p-4'>{renderStatusBadge(r.status)}</td>
                <td className='p-4'>
                  <div className='flex gap-2 justify-end'>
                    {r.status === 'RESERVED' && (
                      <>
                        <Button
                          size='sm'
                          variant='success'
                          onClick={() => handleUpdateStatus(r.id, 'PRESENT')}
                          title='Markeer als aanwezig'
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          size='sm'
                          variant='danger'
                          onClick={() => handleUpdateStatus(r.id, 'NO_SHOW')}
                          title='Markeer als no-show'
                        >
                          <UserX size={16} />
                        </Button>
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() => handleCancel(r.id)}
                          title='Annuleer reservering'
                        >
                          <Ban size={16} />
                        </Button>
                      </>
                    )}
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => openEditModal(r)}
                      title='Bewerk reservering'
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size='sm'
                      variant='danger'
                      onClick={() => handleDelete(r.id)}
                      title='Verwijder reservering'
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className='p-8 text-center text-gray-500'>
                  Geen reserveringen gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='p-4 border-t border-slate-800'>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <ReservationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchReservations}
        reservation={editingReservation}
      />

      <ReservationQrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
