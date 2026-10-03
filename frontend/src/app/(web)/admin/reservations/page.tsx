'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Gamepad2, Plus, Pencil, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { apiClient } from '@/api';
import type { ReservationWithUser, ReservationStatus } from '@/api';
import ReservationModal from './ReservationModal';
import ReservationQrScannerModal from '@/components/reservations/ReservationQrScannerModal';

const ITEMS_PER_PAGE = 10;

/** Extract local date (YYYY-MM-DD) from an ISO datetime string */
function dateFromISO(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format an ISO datetime string to HH:mm in local time */
function formatTime(iso: string): string {
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Get today's local date as YYYY-MM-DD */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithUser[]>([]);
  const [filterDate, setFilterDate] = useState(todayLocal);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationWithUser | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const dividerRef = useRef<HTMLTableRowElement | null>(null);
  const mobileDividerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolled = useRef(false);

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
    // Sort by startTime ascending so past reservations come first, future ones after
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Re-evaluate "now" every minute so the divider moves automatically
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  // Only show the "now" divider when the current time falls within the range of today's reservations
  const nowIsRelevant =
    filtered.length > 0 &&
    now >= new Date(filtered[0].startTime) &&
    now <= new Date(filtered[filtered.length - 1].endTime);

  const dividerIndexInFiltered = nowIsRelevant ? filtered.findIndex((r) => new Date(r.endTime) > now) : -1;
  // The page that contains the divider
  const dividerPage = dividerIndexInFiltered >= 0 ? Math.floor(dividerIndexInFiltered / ITEMS_PER_PAGE) + 1 : -1;
  // The index within the current page's items where the divider sits (before this index)
  const dividerIndexInPage =
    dividerPage === currentPage && dividerIndexInFiltered >= 0
      ? dividerIndexInFiltered - (currentPage - 1) * ITEMS_PER_PAGE
      : -1;

  // On first load, jump to the page containing the divider
  const scrollToDivider = useCallback(() => {
    const el = dividerRef.current || mobileDividerRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (!hasScrolled.current && dividerPage > 0 && reservations.length > 0) {
      hasScrolled.current = true;
      setCurrentPage(dividerPage);
    }
  }, [dividerPage, reservations.length]);

  useEffect(() => {
    // After the page renders with the divider, scroll to it
    if (hasScrolled.current) {
      // Small delay to let DOM render
      const timer = setTimeout(scrollToDivider, 100);
      return () => clearTimeout(timer);
    }
  }, [currentPage, scrollToDivider]);

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
        className={`bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold p-1.5 outline-none focus:border-red-500 cursor-pointer ${current?.color ?? ''}`}
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

  /** Red divider row for the desktop table */
  const renderTableDivider = () => (
    <tr ref={dividerRef}>
      <td colSpan={6} className="p-0">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex-1 h-px bg-red-500" />
          <span className="text-xs font-bold uppercase text-red-500 whitespace-nowrap">Nu</span>
          <div className="flex-1 h-px bg-red-500" />
        </div>
      </td>
    </tr>
  );

  /** Red divider for mobile cards */
  const renderMobileDivider = () => (
    <div ref={mobileDividerRef} className="flex items-center gap-3 px-2 py-1">
      <div className="flex-1 h-px bg-red-500" />
      <span className="text-xs font-bold uppercase text-red-500 whitespace-nowrap">Nu</span>
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="border-b border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              <Plus size={16} /> Nieuwe Reservering
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setScannerOpen(true)}>
              <QrCode size={16} /> Verifieer QR
            </Button>
            <div className="text-xs uppercase tracking-wide text-gray-500 lg:ml-2">{filtered.length} resultaten</div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-end lg:gap-3">
            <div className="sm:min-w-44">
              <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Filter op datum</label>
              <input
                type="date"
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white [&::-webkit-calendar-picker-indicator]:invert"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="sm:min-w-72 lg:min-w-96">
              <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Zoeken</label>
              <input
                type="text"
                placeholder="Zoek op Email of S-nummer"
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="self-end pb-1">
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:underline">
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {paginated.map((r, idx) => (
          <div key={r.id}>
            {dividerIndexInPage === idx && renderMobileDivider()}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-white">{r.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                  {r.user?.sNumber && <p className="text-xs text-gray-500">{r.user.sNumber}</p>}
                </div>
                {renderStatusSelect(r)}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-2">
                  <p className="text-gray-500">Datum</p>
                  <p className="font-semibold text-white">{dateFromISO(r.startTime)}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-2">
                  <p className="text-gray-500">Tijd</p>
                  <p className="font-semibold text-white">
                    {formatTime(r.startTime)} - {formatTime(r.endTime)}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.inventory === 'pc' || r.inventory === 'switch' ? 'danger' : 'info'}>{r.inventory.toUpperCase()}</Badge>
                    {r.controllers > 0 && (
                      <span className="text-xs text-gray-400">
                        <Gamepad2 className="inline" size={12} /> {r.controllers}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditModal(r)} title="Bewerk reservering">
                  <Pencil size={16} /> Bewerk
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)} title="Verwijder reservering">
                  <Trash2 size={16} /> Verwijder
                </Button>
              </div>
            </div>
          </div>
        ))}
        {/* Show divider at the end if all items on this page are past */}
        {dividerIndexInPage === paginated.length && renderMobileDivider()}

        {paginated.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-gray-500">Geen reserveringen gevonden.</div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-gray-500 uppercase">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Datum</th>
              <th className="p-4">Tijd</th>
              <th className="p-4">Hardware</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginated.map((r, idx) => (
              <React.Fragment key={r.id}>
                {dividerIndexInPage === idx && renderTableDivider()}
                <tr>
                  <td className="p-4 font-bold">
                    {r.user?.name || 'Unknown'}
                    <div className="text-xs text-gray-500 font-normal">
                      {r.email}
                      {r.user?.sNumber && <span className="ml-2 text-gray-600">({r.user.sNumber})</span>}
                    </div>
                  </td>
                  <td className="p-4">{dateFromISO(r.startTime)}</td>
                  <td className="p-4">
                    {formatTime(r.startTime)} - {formatTime(r.endTime)}
                  </td>
                  <td className="p-4">
                    <Badge variant={r.inventory === 'pc' || r.inventory === 'switch' ? 'danger' : 'info'}>{r.inventory.toUpperCase()}</Badge>
                    {r.controllers > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        <Gamepad2 className="inline" size={12} /> {r.controllers}
                      </span>
                    )}
                  </td>
                  <td className="p-4">{renderStatusSelect(r)}</td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(r)} title="Bewerk reservering">
                        <Pencil size={16} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)} title="Verwijder reservering">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            {/* Show divider at the end if all items on this page are past */}
            {dividerIndexInPage === paginated.length && renderTableDivider()}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Geen reserveringen gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-800">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <ReservationModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchReservations} reservation={editingReservation} />

      <ReservationQrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onVerified={() => {
          void fetchReservations();
        }}
      />
    </div>
  );
}
