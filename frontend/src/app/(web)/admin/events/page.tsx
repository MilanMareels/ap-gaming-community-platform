'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Users, Pencil, X, Plus, Eye, Trophy, CalendarDays, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';
import type { Event, EventCategory } from '@/api';

const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'SINGLE_DAY', label: 'Evenement (één dag)' },
  { value: 'MULTI_DAY', label: 'Meerdaags evenement' },
  { value: 'TOURNAMENT_BRACKET', label: 'Bracket Toernooi' },
  { value: 'TOURNAMENT_TIMED', label: 'Time Trial Toernooi' },
  { value: 'TOURNAMENT_POINTS', label: 'Puntenklassement' },
];

const EVENT_TYPES = ['Casual', 'Tournament', 'Workshop', 'LAN Party', 'Overig'];

type EventWithCount = Event & { _count?: { registrations: number } };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function categoryLabel(cat: string): string {
  return EVENT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

interface EventFormState {
  title: string;
  description: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  type: string;
  registrationEnabled: boolean;
}

const emptyForm: EventFormState = {
  title: '',
  description: '',
  category: 'SINGLE_DAY',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  type: '',
  registrationEnabled: false,
};

function EventRow({ ev, onEdit, onDelete, isPast }: { ev: EventWithCount; onEdit: (ev: EventWithCount) => void; onDelete: (id: number) => void; isPast?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/20 transition-colors group">
      <div className="flex items-center gap-4 min-w-0">
        {/* Date badge */}
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
          isPast
            ? 'bg-linear-to-br from-slate-800/50 to-slate-800/20 border-slate-700/40'
            : 'bg-linear-to-br from-red-500/15 to-red-600/5 border-red-500/20'
        }`}>
          <span className={`text-[10px] font-bold uppercase leading-none ${isPast ? 'text-gray-500' : 'text-red-400/80'}`}>
            {new Date(ev.startTime).toLocaleDateString('nl-NL', { month: 'short' })}
          </span>
          <span className={`text-lg font-black leading-tight ${isPast ? 'text-gray-400' : 'text-white'}`}>
            {new Date(ev.startTime).getDate()}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold truncate ${isPast ? 'text-gray-400' : 'text-white'}`}>{ev.title}</span>
            <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
              {categoryLabel(ev.category)}
            </span>
            {ev.type && (
              <span className="text-[10px] bg-slate-800/60 text-gray-500 px-2 py-0.5 rounded-full font-semibold shrink-0">
                {ev.type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {formatDate(ev.startTime)}
              {new Date(ev.startTime).toDateString() !== new Date(ev.endTime).toDateString() && ` — ${formatDate(ev.endTime)}`}
            </span>
            <span>
              {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
            </span>
            {ev.registrationEnabled && (
              <span className="flex items-center gap-1 text-green-400">
                <Users size={12} /> {ev._count?.registrations ?? 0} inschrijvingen
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
        <Link href={`/admin/events/${ev.id}`}>
          <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors" title="Details">
            <Eye size={16} />
          </button>
        </Link>
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors" onClick={() => onEdit(ev)} title="Bewerken">
          <Pencil size={16} />
        </button>
        <button className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors" onClick={() => onDelete(ev.id)} title="Verwijderen">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const dateInputClass = `${inputClass} [&::-webkit-calendar-picker-indicator]:invert`;
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithCount | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.GET('/events/all' as '/events', {});
      if (res.data) setEvents(res.data as unknown as EventWithCount[]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.GET('/events/all' as '/events', {});
      if (res.data) setEvents(res.data as unknown as EventWithCount[]);
    };
    load().catch(console.error);
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (ev: EventWithCount) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? '',
      category: ev.category as EventCategory,
      startDate: toDateInputValue(ev.startTime),
      startTime: toTimeInputValue(ev.startTime),
      endDate: toDateInputValue(ev.endTime),
      endTime: toTimeInputValue(ev.endTime),
      type: ev.type ?? '',
      registrationEnabled: ev.registrationEnabled,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.startDate || !form.startTime || !form.endTime) return;

    const isSingleDay = form.category === 'SINGLE_DAY';
    if (!isSingleDay && !form.endDate) return;

    const startTime = new Date(`${form.startDate}T${form.startTime}:00`).toISOString();
    const endDateStr = isSingleDay ? form.startDate : form.endDate;
    const endTime = new Date(`${endDateStr}T${form.endTime}:00`).toISOString();

    setSaving(true);
    try {
      if (editingEvent) {
        await apiClient.PATCH('/events/{id}', {
          params: { path: { id: editingEvent.id.toString() } },
          body: {
            title: form.title,
            description: form.description || undefined,
            startTime,
            endTime,
            type: form.type || undefined,
            registrationEnabled: form.registrationEnabled,
          },
        });
      } else {
        await apiClient.POST('/events', {
          body: {
            title: form.title,
            description: form.description || undefined,
            category: form.category,
            startTime,
            endTime,
            type: form.type || undefined,
            registrationEnabled: form.registrationEnabled,
          },
        });
      }
      closeModal();
      await fetchEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/events/{id}', {
        params: { path: { id: id.toString() } },
      });
      if (editingEvent?.id === id) closeModal();
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const now = new Date();
  const upcomingEvents = events
    .filter((ev) => new Date(ev.endTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const pastEvents = events
    .filter((ev) => new Date(ev.endTime) < now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const isSingleDay = form.category === 'SINGLE_DAY';
  const isEditing = editingEvent !== null;

  return (
    <>
      <PageHeader
        title="Events"
        description="Maak en beheer evenementen en toernooien."
        actions={
          <Button size="sm" variant="primary" onClick={openCreateModal}>
            <Plus size={16} /> Nieuw Event
          </Button>
        }
      />

      {/* Events List */}
      {events.length === 0 ? (
        <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
          <EmptyState
            icon={Trophy}
            title="Geen events gepland"
            description="Plan een nieuw evenement of toernooi in."
            action={
              <Button size="sm" variant="primary" onClick={openCreateModal}>
                <Plus size={16} /> Nieuw Event
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={16} className="text-red-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Komende Events</h2>
                <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold">{upcomingEvents.length}</span>
              </div>
              <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-800/60">
                  {upcomingEvents.map((ev) => (
                    <EventRow key={ev.id} ev={ev} onEdit={openEditModal} onDelete={handleDeleteEvent} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-gray-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Afgelopen Events</h2>
                <span className="text-xs bg-slate-800 text-gray-500 px-2 py-0.5 rounded-full font-bold">{pastEvents.length}</span>
              </div>
              <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden opacity-70">
                <div className="divide-y divide-slate-800/60">
                  {pastEvents.map((ev) => (
                    <EventRow key={ev.id} ev={ev} onEdit={openEditModal} onDelete={handleDeleteEvent} isPast />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">{isEditing ? 'Event Bewerken' : 'Nieuw Event'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{isEditing ? 'Pas de details van dit event aan.' : 'Plan een nieuw evenement of toernooi in.'}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Titel *</label>
                <input
                  className={inputClass}
                  placeholder="Naam van het event"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className={labelClass}>Beschrijving</label>
                <textarea
                  className={`${inputClass} resize-y min-h-20`}
                  placeholder="Optionele beschrijving"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Categorie {!isEditing ? '*' : ''}</label>
                  {isEditing ? (
                    <p className="text-sm text-gray-300 bg-slate-950 border border-slate-700 py-2.5 px-3 rounded-lg">
                      {categoryLabel(form.category)}
                    </p>
                  ) : (
                    <select
                      className={inputClass}
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })}
                    >
                      {EVENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Type label</label>
                  <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="">Geen</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date/time section */}
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Datum & Tijd</div>

                {isSingleDay ? (
                  <>
                    <div>
                      <label className={labelClass}>Datum *</label>
                      <input
                        type="date"
                        className={dateInputClass}
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Starttijd *</label>
                        <input type="time" className={dateInputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Eindtijd *</label>
                        <input type="time" className={dateInputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Startdatum *</label>
                        <input type="date" className={dateInputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ colorScheme: 'dark' }} />
                      </div>
                      <div>
                        <label className={labelClass}>Starttijd *</label>
                        <input type="time" className={dateInputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Einddatum *</label>
                        <input type="date" className={dateInputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ colorScheme: 'dark' }} />
                      </div>
                      <div>
                        <label className={labelClass}>Eindtijd *</label>
                        <input type="time" className={dateInputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl">
                <input
                  type="checkbox"
                  checked={form.registrationEnabled}
                  onChange={(e) => setForm({ ...form, registrationEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
                <div>
                  <span className="text-sm text-white font-medium">Inschrijving inschakelen</span>
                  <p className="text-xs text-gray-500 mt-0.5">Gebruikers kunnen zich registreren voor dit event.</p>
                </div>
              </label>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-slate-800/60 bg-slate-900/95 backdrop-blur-sm rounded-b-2xl flex gap-3">
              <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={saving}>
                <Plus size={16} />
                {saving ? 'Opslaan...' : isEditing ? 'Wijzigingen Opslaan' : 'Event Aanmaken'}
              </Button>
              <Button variant="secondary" onClick={closeModal}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
