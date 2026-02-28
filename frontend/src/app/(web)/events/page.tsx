'use client';

import { useState, useEffect } from 'react';
import { Clock, Gamepad2 } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { Event } from '@/api';

function formatDateParts(dateStr: string): [string, string] {
  const d = new Date(dateStr);
  return [
    d.toLocaleDateString('nl-NL', { day: 'numeric' }),
    d.toLocaleDateString('nl-NL', { month: 'short' }),
  ];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.GET('/events');
      if (res.data) {
        setEvents(res.data as unknown as Event[]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center text-white'>
        <div className='animate-spin'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 text-white py-24 px-4'>
      <div className='container mx-auto max-w-4xl'>
        <ScrollReveal direction='up'>
          <h1 className='text-5xl font-black text-center mb-12'>
            AANKOMENDE <span className='text-red-600'>EVENTS</span>
          </h1>
        </ScrollReveal>

        <div className='grid gap-6'>
          {events.length === 0 ? (
            <div className='text-center text-gray-500 py-12 border border-dashed border-slate-800 rounded-xl'>
              Geen evenementen gepland.
            </div>
          ) : (
            events.map((event, index) => {
              const [day, month] = formatDateParts(event.startTime);
              return (
                <ScrollReveal key={event.id} direction='up' delay={index * 100}>
                  <div className='flex flex-col md:flex-row items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-red-500/50 transition-all'>
                    <div className='bg-slate-950 p-4 rounded-xl text-center min-w-22.5 border border-slate-800 mb-4 md:mb-0 md:mr-8'>
                      <span className='block text-red-500 font-black text-2xl'>
                        {day}
                      </span>
                      <span className='block text-xs text-gray-400 font-bold uppercase'>
                        {month}
                      </span>
                    </div>
                    <div className='flex-1 text-center md:text-left'>
                      <h3 className='text-2xl font-bold text-white mb-2'>
                        {event.title}
                      </h3>
                      <div className='flex gap-4 text-sm text-gray-400 justify-center md:justify-start'>
                        <span className='flex items-center gap-2'>
                          <Clock size={16} className='text-red-500' />{' '}
                          {formatTime(event.startTime)} -{' '}
                          {formatTime(event.endTime)}
                        </span>
                        <span className='flex items-center gap-2'>
                          <Gamepad2 size={16} className='text-red-500' />{' '}
                          {event.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
