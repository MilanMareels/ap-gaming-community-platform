'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Gamepad2, Plus, Pencil, QrCode, CalendarDays, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';
import type { ReservationWithUser, ReservationStatus } from '@/api';
import ReservationModal from './ReservationModal';
import ReservationQrScannerModal from '@/components/reservations/ReservationQrScannerModal';

const ITEMS_PER_PAGE = 10;

function dateFromISO(iso: string): string {
  return iso.slice(0, 10);
}

function formatTime(iso: string): string {
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return d.toISOString().slice(11, 16);
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithUser[]>([]);
  const [filterDate, setFilterDate] = useState(todayLocal);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationWithUser | null>(null);
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
    if (!confirm('Weet je zeker dat je deze reservering wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/reservations/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchReservations();
    } catch (err) {
      console.error('Failed to delete reservation:', err);
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

  const filtered = reservations
    .filter((r) => {
      if (filterDate && dateFromISO(r.startTime) !== filterDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesEmail = r.email.toLowerCase().includes(q);
        const matchesName = r.user?.name?.toLowerCase().includes(q);
        const matchesSNumber = r.user?.sNumber?.toLowerCase().includes(q);
        if (!matchesEmail && !matchesName && !matchesSNumber) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statusOptions: { value: ReservationStatus; label: string; color: string }[] = [
    { value: 'RESERVED', label: 'Geboekt', color: 'text-yellow-400' },
    { value: 'PRESENT', label: 'Aanwezig', color: 'text-green-400' },
    { value: 'NO_SHOW', label: 'Afwezig', color: 'text-red-400' },
    { value: 'CANCELLED', label: 'Geannuleerd', color: 'text-orange-400' },
  ];

  const handleStatusChange = async (r: ReservationWithUser, newStatus: ReservationStatus) => {
    if (newStatus === 'CANCELLED' && !confirm('Weet je zeker dat je deze reservering wilt annuleren?')) return;
    await handleUpdateStatus(r.id, newStatus);
  };

  const renderStatusSelect = (r: ReservationWithUser) => {
    const current = statusOptions.find((o) => o.value === r.status);
    return (
      <select
        className={`bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold py-1.5 px-2 outline-none focus:border-red-500 cursor-pointer ${current?.color ?? ''}`}
        value={r.status}
        onChange={(e) => handleStatusChange(r, e.target.value as ReservationStatus)}
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <>
      <PageHeader
        title="Reservaties"
        description="Beheer en bekijk alle reserveringen."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setScannerOpen(true)}>
              <QrCode size={16} /> Verifieer QR
            </Button>
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              <Plus size={16} /> Nieuwe Reservering
            </Button>
          </>
        }
      />

      <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/50">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Zoek op naam, email of s-nummer..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Datum</label>
                <input
                  type="date"
                  className="bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-colors"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-xs text-red-400 hover:text-red-300 pb-3 transition-colors">
                  Reset
                </button>
              )}
              <div className="ml-auto text-xs text-gray-500 pb-3">{filtered.length} resultaten</div>
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-3">
          {paginated.map((r) => (
            <div key={r.id} className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/80 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link href={`/admin/users?search=${encodeURIComponent(r.email)}`} className="flex items-center gap-3 group/user">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                      {getInitials(r.user?.name)}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm group-hover/user:text-red-400 transition-colors">{r.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.user?.sNumber || r.email}</p>
                    </div>
                  </Link>
                  {renderStatusSelect(r)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-2.5">
                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Datum</p>
                    <p className="font-medium text-white mt-0.5">{dateFromISO(r.startTime)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-2.5">
                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Tijd</p>
                    <p className="font-medium text-white mt-0.5">{formatTime(r.startTime)}-{formatTime(r.endTime)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-2.5">
                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Hardware</p>
                    <p className="font-medium text-red-400 mt-0.5">{r.inventory.toUpperCase()}</p>
                  </div>
                </div>
              </div>
              <div className="flex border-t border-slate-800/60">
                <button
                  onClick={() => openEditModal(r)}
                  className="flex-1 py-2.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-slate-800/40 transition-colors flex items-center justify-center gap-1.5 border-r border-slate-800/60"
                >
                  <Pencil size={14} /> Bewerk
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-1 py-2.5 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Verwijder
                </button>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Geen reserveringen gevonden"
              description="Er zijn geen reserveringen voor de geselecteerde filters. Probeer een andere datum of maak een nieuwe reservering aan."
              action={
                <Button size="sm" variant="primary" onClick={openCreateModal}>
                  <Plus size={16} /> Nieuwe Reservering
                </Button>
              }
            />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950 text-gray-500">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Datum</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Tijd</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Hardware</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/users?search=${encodeURIComponent(r.email)}`} className="group/user">
                      <div className="font-medium text-white group-hover/user:text-red-400 transition-colors">{r.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.email}
                        {r.user?.sNumber && <span className="text-gray-600 ml-1">({r.user.sNumber})</span>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-gray-300">{dateFromISO(r.startTime)}</td>
                  <td className="px-4 py-3.5 text-gray-300">
                    {formatTime(r.startTime)} - {formatTime(r.endTime)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={r.inventory === 'pc' || r.inventory === 'switch' ? 'danger' : 'info'}>{r.inventory.toUpperCase()}</Badge>
                    {r.controllers > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        <Gamepad2 className="inline" size={12} /> {r.controllers}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">{renderStatusSelect(r)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Bewerken"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={CalendarDays}
                      title="Geen reserveringen gevonden"
                      description="Er zijn geen reserveringen voor de geselecteerde filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-800/60">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            pageSize={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      <ReservationModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchReservations} reservation={editingReservation} />

      <ReservationQrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onVerified={() => {
          void fetchReservations();
        }}
      />
    </>
  );
}
