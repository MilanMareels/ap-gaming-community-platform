'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Users, Pencil, X, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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

interface EditFormState {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  type: string;
  registrationEnabled: boolean;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventWithCount | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    category: 'SINGLE_DAY' as EventCategory,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    type: '',
    registrationEnabled: false,
  });

  const isSingleDay = newEvent.category === 'SINGLE_DAY';

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

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.startDate || !newEvent.startTime || !newEvent.endTime) return;
    if (!isSingleDay && !newEvent.endDate) return;

    const startTime = new Date(`${newEvent.startDate}T${newEvent.startTime}:00`).toISOString();
    const endDateStr = isSingleDay ? newEvent.startDate : newEvent.endDate;
    const endTime = new Date(`${endDateStr}T${newEvent.endTime}:00`).toISOString();

    try {
      await apiClient.POST('/events', {
        body: {
          title: newEvent.title,
          description: newEvent.description || undefined,
          category: newEvent.category,
          startTime,
          endTime,
          type: newEvent.type || undefined,
          registrationEnabled: newEvent.registrationEnabled,
        },
      });
      setNewEvent({
        title: '',
        description: '',
        category: 'SINGLE_DAY',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        type: '',
        registrationEnabled: false,
      });
      await fetchEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/events/{id}', {
        params: { path: { id: id.toString() } },
      });
      if (editingEvent?.id === id) {
        setEditingEvent(null);
        setEditForm(null);
      }
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const openEditModal = (ev: EventWithCount) => {
    setEditingEvent(ev);
    setEditForm({
      title: ev.title,
      description: ev.description ?? '',
      startDate: toDateInputValue(ev.startTime),
      startTime: toTimeInputValue(ev.startTime),
      endDate: toDateInputValue(ev.endTime),
      endTime: toTimeInputValue(ev.endTime),
      type: ev.type ?? '',
      registrationEnabled: ev.registrationEnabled,
    });
  };

  const closeEditModal = () => {
    setEditingEvent(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editForm || !editForm.title.trim() || !editForm.startDate || !editForm.startTime || !editForm.endTime) return;

    const isEventSingleDay = editingEvent.category === 'SINGLE_DAY';
    const startTime = new Date(`${editForm.startDate}T${editForm.startTime}:00`).toISOString();
    const endDateStr = isEventSingleDay ? editForm.startDate : editForm.endDate;
    const endTime = new Date(`${endDateStr}T${editForm.endTime}:00`).toISOString();

    setSaving(true);
    try {
      await apiClient.PATCH('/events/{id}', {
        params: { path: { id: editingEvent.id.toString() } },
        body: {
          title: editForm.title,
          description: editForm.description || undefined,
          startTime,
          endTime,
          type: editForm.type || undefined,
          registrationEnabled: editForm.registrationEnabled,
        },
      });
      closeEditModal();
      await fetchEvents();
    } catch (err) {
      console.error('Failed to update event:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors';
  const dateInputClass = `${inputClass} [&::-webkit-calendar-picker-indicator]:invert`;

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Add Event Form */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
          <h3 className="font-bold mb-4">Event Toevoegen &amp; Inplannen</h3>
          <div className="space-y-3">
            <input
              required
              className={inputClass}
              placeholder="Titel"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />

            <textarea
              className={`${inputClass} resize-y min-h-[80px]`}
              placeholder="Beschrijving (optioneel)"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              rows={3}
            />

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold">Categorie</label>
              <select
                className={inputClass}
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as EventCategory })}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {isSingleDay ? (
              <>
                <input
                  required
                  type="date"
                  className={dateInputClass}
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Starttijd</label>
                    <input
                      required
                      type="time"
                      className={dateInputClass}
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Eindtijd</label>
                    <input
                      required
                      type="time"
                      className={dateInputClass}
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Startdatum</label>
                    <input
                      required
                      type="date"
                      className={dateInputClass}
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Starttijd</label>
                    <input
                      required
                      type="time"
                      className={dateInputClass}
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Einddatum</label>
                    <input
                      required
                      type="date"
                      className={dateInputClass}
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Eindtijd</label>
                    <input
                      required
                      type="time"
                      className={dateInputClass}
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold">Type label (optioneel)</label>
              <select
                className={inputClass}
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              >
                <option value="">Geen</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950 border border-slate-700 rounded-xl">
              <input
                type="checkbox"
                checked={newEvent.registrationEnabled}
                onChange={(e) => setNewEvent({ ...newEvent, registrationEnabled: e.target.checked })}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-gray-300">Inschrijving inschakelen</span>
            </label>

            <button onClick={handleAddEvent} className="w-full bg-green-600 font-bold py-3 rounded-xl hover:bg-green-500 transition-colors">
              Opslaan in Agenda
            </button>
          </div>
        </div>

        {/* Right: Events List */}
        <div className="lg:col-span-2 space-y-2">
          {events.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8 bg-slate-900 rounded-xl border border-slate-800">Geen events gepland.</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {ev.title}
                    <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      {categoryLabel(ev.category)}
                    </span>
                    {ev.registrationEnabled && (
                      <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        <Users size={10} /> {ev._count?.registrations ?? 0}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(ev.startTime)}
                    {new Date(ev.startTime).toDateString() !== new Date(ev.endTime).toDateString() && ` - ${formatDate(ev.endTime)}`}
                    {' | '}
                    {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
                    {ev.type && ` (${ev.type})`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/events/${ev.id}`}>
                    <Button size="sm" variant="ghost">
                      <Eye size={16} />
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(ev)}>
                    <Pencil size={16} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteEvent(ev.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingEvent && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Event Bewerken</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold">Categorie</label>
                <p className="text-sm text-gray-300 bg-slate-950 border border-slate-700 p-3 rounded-xl">
                  {categoryLabel(editingEvent.category)}
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold">Titel</label>
                <input
                  className={inputClass}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold">Beschrijving</label>
                <textarea
                  className={`${inputClass} resize-y min-h-[80px]`}
                  placeholder="Beschrijving (optioneel)"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              {editingEvent.category === 'SINGLE_DAY' ? (
                <>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Datum</label>
                    <input type="date" className={dateInputClass} value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Starttijd</label>
                      <input type="time" className={dateInputClass} value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Eindtijd</label>
                      <input type="time" className={dateInputClass} value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Startdatum</label>
                      <input type="date" className={dateInputClass} value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Starttijd</label>
                      <input type="time" className={dateInputClass} value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Einddatum</label>
                      <input type="date" className={dateInputClass} value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Eindtijd</label>
                      <input type="time" className={dateInputClass} value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold">Type label</label>
                <select className={inputClass} value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                  <option value="">Geen</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950 border border-slate-700 rounded-xl">
                <input
                  type="checkbox"
                  checked={editForm.registrationEnabled}
                  onChange={(e) => setEditForm({ ...editForm, registrationEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-sm text-gray-300">Inschrijving inschakelen</span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button variant="success" className="flex-1" onClick={handleSaveEdit} disabled={saving}>
                  <Check size={16} />
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </Button>
                <Button variant="secondary" onClick={closeEditModal}>
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
