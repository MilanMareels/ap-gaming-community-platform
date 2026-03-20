'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { Event } from '@/api';

const EVENT_TYPES = ['Casual', 'Tournament', 'Workshop', 'LAN Party', 'Overig'];

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: EVENT_TYPES[0],
  });

  const fetchEvents = async () => {
    try {
      const res = await apiClient.GET('/events/all' as '/events', {});
      if (res.data) setEvents(res.data as unknown as Event[]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.GET('/events/all' as '/events', {});
      if (res.data) setEvents(res.data as unknown as Event[]);
    };
    load().catch(console.error);
  }, []);

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.startTime || !newEvent.endTime) return;

    const startTime = new Date(`${newEvent.date}T${newEvent.startTime}:00`).toISOString();
    const endTime = new Date(`${newEvent.date}T${newEvent.endTime}:00`).toISOString();

    try {
      await apiClient.POST('/events', {
        body: {
          title: newEvent.title,
          startTime,
          endTime,
          type: newEvent.type,
        },
      });
      setNewEvent({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        type: EVENT_TYPES[0],
      });
      await fetchEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen?')) return;
    try {
      await apiClient.DELETE(
        '/events/{id}',
        {
          params: { path: { id: id.toString() } },
        },
      );
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left: Add Event Form */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
        <h3 className="font-bold mb-4">Event Toevoegen &amp; Inplannen</h3>
        <div className="space-y-3">
          <input
            required
            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
            placeholder="Titel"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />

          <input
            required
            type="date"
            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold">Starttijd</label>
              <input
                required
                type="time"
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold">Eindtijd</label>
              <input
                required
                type="time"
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
              />
            </div>
          </div>

          <select
            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
            value={newEvent.type}
            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

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
                <div className="font-bold">{ev.title}</div>
                <div className="text-xs text-gray-400">
                  {formatDate(ev.startTime)} | {formatTime(ev.startTime)} - {formatTime(ev.endTime)} ({ev.type})
                </div>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDeleteEvent(ev.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
