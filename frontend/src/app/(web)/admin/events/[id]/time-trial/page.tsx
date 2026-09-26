'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Timer,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
} from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';

type EventWithCount = Event & { _count?: { registrations: number } };

interface TimeTrialRun {
  id: number;
  timeMs: number;
  createdAt: string;
}

interface TimeTrialParticipant {
  id: number;
  name: string;
  email: string | null;
  userId: number | null;
  bestTimeMs: number | null;
  runs: TimeTrialRun[];
  user: { id: number; name: string | null; email: string } | null;
}

interface TimeTrial {
  id: number;
  eventId: number;
  status: 'ACTIVE' | 'COMPLETED';
  participants: TimeTrialParticipant[];
}

interface Registration {
  id: number;
  user: { id: number; name: string | null; email: string; sNumber: string };
}

function formatTimeMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function parseTimeString(str: string): number | null {
  const match = str.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  const [, m, s, ms] = match;
  const seconds = parseInt(s);
  if (seconds >= 60) return null;
  return (
    parseInt(m) * 60000 +
    seconds * 1000 +
    parseInt((ms || '0').padEnd(3, '0'))
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actief',
  COMPLETED: 'Afgelopen',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-500/15 text-red-400',
  COMPLETED: 'bg-green-500/15 text-green-400',
};

export default function AdminTimeTrialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id;

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [timeTrial, setTimeTrial] = useState<TimeTrial | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Add participant + run form
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<
    string
  >('');
  const [customName, setCustomName] = useState('');
  const [newTimeValue, setNewTimeValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add run to existing participant
  const [addRunParticipantId, setAddRunParticipantId] = useState<number | null>(
    null,
  );
  const [addRunTimeValue, setAddRunTimeValue] = useState('');

  // Expanded participant (show run history)
  const [expandedParticipantId, setExpandedParticipantId] = useState<
    number | null
  >(null);

  const loadData = async () => {
    try {
      const [eventRes, ttRes, regRes] = await Promise.all([
        apiClient.GET('/events/{id}', { params: { path: { id: eventId } } }),
        apiClient.GET('/events/{eventId}/time-trial', {
          params: { path: { eventId } },
        }),
        apiClient.GET('/events/{id}/registrations', {
          params: { path: { id: eventId } },
        }),
      ]);
      if (eventRes.data)
        setEvent(eventRes.data as unknown as EventWithCount);
      if (ttRes.data) setTimeTrial(ttRes.data as unknown as TimeTrial);
      else setTimeTrial(null);
      if (regRes.data)
        setRegistrations(regRes.data as unknown as Registration[]);
    } catch {
      // Time trial might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiClient.POST('/events/{eventId}/time-trial', {
        params: { path: { eventId } },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create time trial:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Time trial verwijderen? Dit verwijdert alle deelnemers en tijden.',
      )
    )
      return;
    try {
      await apiClient.DELETE('/events/{eventId}/time-trial', {
        params: { path: { eventId } },
      });
      setTimeTrial(null);
    } catch (err) {
      console.error('Failed to delete time trial:', err);
    }
  };

  const handleStatusChange = async (status: 'ACTIVE' | 'COMPLETED') => {
    if (status === 'COMPLETED' && !confirm('Time trial afronden?')) return;
    try {
      await apiClient.PATCH('/events/{eventId}/time-trial', {
        params: { path: { eventId } },
        body: { status },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Get registrations not yet added as participants
  const availableRegistrations = registrations.filter(
    (reg) =>
      !timeTrial?.participants.some((p) => p.userId === reg.user.id),
  );

  const handleAddParticipantWithRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeTrial) return;

    const timeMs = parseTimeString(newTimeValue);
    if (timeMs === null) {
      alert('Ongeldig tijdformaat. Gebruik mm:ss.ms (bijv. 1:23.456)');
      return;
    }

    setSubmitting(true);
    try {
      let participantId: number | undefined;

      if (selectedRegistrationId) {
        // Adding from registration
        const reg = registrations.find(
          (r) => r.id === parseInt(selectedRegistrationId),
        );
        if (!reg) return;

        // Check if participant already exists
        const existing = timeTrial.participants.find(
          (p) => p.userId === reg.user.id,
        );
        if (existing) {
          participantId = existing.id;
        } else {
          const res = await apiClient.POST(
            '/events/{eventId}/time-trial/participants',
            {
              params: { path: { eventId } },
              body: {
                name: reg.user.name ?? reg.user.email,
                email: reg.user.email,
                userId: reg.user.id,
              },
            },
          );
          if (res.data) {
            participantId = (res.data as unknown as TimeTrialParticipant).id;
          }
        }
      } else if (customName.trim()) {
        // Adding custom name
        const res = await apiClient.POST(
          '/events/{eventId}/time-trial/participants',
          {
            params: { path: { eventId } },
            body: { name: customName.trim() },
          },
        );
        if (res.data) {
          participantId = (res.data as unknown as TimeTrialParticipant).id;
        }
      }

      if (participantId) {
        await apiClient.POST(
          '/events/{eventId}/time-trial/participants/{participantId}/runs',
          {
            params: {
              path: { eventId, participantId: String(participantId) },
            },
            body: { timeMs },
          },
        );
      }

      setSelectedRegistrationId('');
      setCustomName('');
      setNewTimeValue('');
      await loadData();
    } catch (err) {
      console.error('Failed to add participant/run:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRun = async (participantId: number) => {
    const timeMs = parseTimeString(addRunTimeValue);
    if (timeMs === null) {
      alert('Ongeldig tijdformaat. Gebruik mm:ss.ms (bijv. 1:23.456)');
      return;
    }
    try {
      await apiClient.POST(
        '/events/{eventId}/time-trial/participants/{participantId}/runs',
        {
          params: {
            path: { eventId, participantId: String(participantId) },
          },
          body: { timeMs },
        },
      );
      setAddRunParticipantId(null);
      setAddRunTimeValue('');
      await loadData();
    } catch (err) {
      console.error('Failed to add run:', err);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    try {
      await apiClient.DELETE('/events/{eventId}/time-trial/runs/{runId}', {
        params: { path: { eventId, runId: String(runId) } },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete run:', err);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm('Deelnemer en alle runs verwijderen?')) return;
    try {
      await apiClient.DELETE(
        '/events/{eventId}/time-trial/participants/{participantId}',
        {
          params: {
            path: { eventId, participantId: String(participantId) },
          },
        },
      );
      await loadData();
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Event niet gevonden.</p>
        <Link
          href="/admin/events"
          className="text-red-500 hover:underline font-bold"
        >
          <ArrowLeft size={14} className="inline mr-1" /> Terug naar events
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/admin/events/${eventId}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 font-bold text-sm"
      >
        <ArrowLeft size={14} /> Terug naar event
      </Link>

      {/* Event header */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-2xl font-black">{event.title}</h2>
          <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase">
            Time Trial
          </span>
          {timeTrial && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_COLORS[timeTrial.status]}`}
            >
              {STATUS_LABELS[timeTrial.status]}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-gray-400 text-sm">{event.description}</p>
        )}
      </div>

      {/* No time trial yet */}
      {!timeTrial && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Timer size={18} className="text-red-500" />
            Time trial aanmaken
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Start een time trial om tijden bij te houden en een live ranglijst te
            tonen.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
          >
            {creating ? 'Aanmaken...' : 'Time trial starten'}
          </button>
        </div>
      )}

      {/* Time trial exists */}
      {timeTrial && (
        <>
          {/* Add participant + time */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Plus size={16} className="text-red-500" />
              Tijd toevoegen
            </h3>
            <form
              onSubmit={handleAddParticipantWithRun}
              className="flex flex-wrap gap-3 items-end"
            >
              <div className="flex-1 min-w-50">
                <label className="block text-xs text-gray-400 mb-1 font-bold">
                  Deelnemer
                </label>
                {availableRegistrations.length > 0 ? (
                  <select
                    value={selectedRegistrationId}
                    onChange={(e) => {
                      setSelectedRegistrationId(e.target.value);
                      if (e.target.value) setCustomName('');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">-- Kies ingeschreven gebruiker --</option>
                    {availableRegistrations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.user.name ?? reg.user.email} ({reg.user.sNumber})
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder={
                    availableRegistrations.length > 0
                      ? 'Of typ een naam...'
                      : 'Naam'
                  }
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    if (e.target.value) setSelectedRegistrationId('');
                  }}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 ${availableRegistrations.length > 0 ? 'mt-2' : ''}`}
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-400 mb-1 font-bold">
                  Tijd (mm:ss.ms)
                </label>
                <input
                  type="text"
                  placeholder="0:00.000"
                  value={newTimeValue}
                  onChange={(e) => setNewTimeValue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder:text-gray-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={
                  submitting ||
                  (!selectedRegistrationId && !customName.trim()) ||
                  !newTimeValue
                }
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {submitting ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </form>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Timer size={16} className="text-red-500" />
                Ranglijst ({timeTrial.participants.length} deelnemers)
              </h3>
              <div className="flex gap-2">
                {timeTrial.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 size={12} /> Afronden
                  </button>
                )}
                {timeTrial.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleStatusChange('ACTIVE')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={12} /> Heropenen
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="bg-slate-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={12} /> Verwijderen
                </button>
              </div>
            </div>

            {timeTrial.participants.length === 0 ? (
              <div className="text-center text-gray-500 italic py-8">
                Nog geen deelnemers. Voeg hierboven een tijd toe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3 font-bold w-12">#</th>
                      <th className="px-4 py-3 font-bold">Naam</th>
                      <th className="px-4 py-3 font-bold w-36">Beste tijd</th>
                      <th className="px-4 py-3 font-bold w-20">Runs</th>
                      <th className="px-4 py-3 font-bold w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeTrial.participants.map((participant, idx) => {
                      const hasBest = participant.bestTimeMs !== null;
                      const rank = hasBest ? idx + 1 : null;
                      const isExpanded =
                        expandedParticipantId === participant.id;
                      const isAddingRun =
                        addRunParticipantId === participant.id;

                      return (
                        <React.Fragment key={participant.id}>
                          <tr
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() =>
                              setExpandedParticipantId(
                                isExpanded ? null : participant.id,
                              )
                            }
                          >
                            <td className="px-4 py-3 text-gray-500 font-bold">
                              {rank ?? '-'}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                {participant.name}
                                {participant.userId && (
                                  <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">
                                    Gebruiker
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-mono font-bold ${hasBest ? 'text-white' : 'text-gray-600'}`}
                              >
                                {hasBest
                                  ? formatTimeMs(participant.bestTimeMs!)
                                  : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {participant.runs.length}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddRunParticipantId(
                                      isAddingRun ? null : participant.id,
                                    );
                                    setAddRunTimeValue('');
                                  }}
                                  className="text-gray-500 hover:text-white transition-colors"
                                  title="Nieuwe run toevoegen"
                                >
                                  <Clock size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveParticipant(participant.id);
                                  }}
                                  className="text-gray-600 hover:text-red-400 transition-colors"
                                  title="Verwijderen"
                                >
                                  <Trash2 size={14} />
                                </button>
                                {isExpanded ? (
                                  <ChevronUp
                                    size={14}
                                    className="text-gray-500"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-500"
                                  />
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Add run inline */}
                          {isAddingRun && (
                            <tr className="border-b border-slate-800/50 bg-slate-800/20">
                              <td colSpan={5} className="px-4 py-3">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleAddRun(participant.id);
                                  }}
                                  className="flex items-center gap-3"
                                >
                                  <span className="text-gray-400 text-xs font-bold">
                                    Nieuwe run:
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="0:00.000"
                                    value={addRunTimeValue}
                                    onChange={(e) =>
                                      setAddRunTimeValue(e.target.value)
                                    }
                                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm font-mono"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <button
                                    type="submit"
                                    className="text-green-400 hover:text-green-300 text-xs font-bold"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Opslaan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddRunParticipantId(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-300 text-xs"
                                  >
                                    Annuleren
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}

                          {/* Expanded run history */}
                          {isExpanded && participant.runs.length > 0 && (
                            <tr className="border-b border-slate-800/50">
                              <td colSpan={5} className="px-4 py-0">
                                <div className="py-3 pl-8 border-l-2 border-slate-700 ml-4">
                                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                    Alle runs
                                  </p>
                                  <div className="space-y-1">
                                    {participant.runs.map((run, runIdx) => (
                                      <div
                                        key={run.id}
                                        className="flex items-center gap-4 text-sm group"
                                      >
                                        <span className="text-gray-600 text-xs w-6">
                                          {runIdx + 1}.
                                        </span>
                                        <span
                                          className={`font-mono ${runIdx === 0 ? 'text-green-400 font-bold' : 'text-gray-400'}`}
                                        >
                                          {formatTimeMs(run.timeMs)}
                                        </span>
                                        {runIdx === 0 && (
                                          <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">
                                            Beste
                                          </span>
                                        )}
                                        <span className="text-gray-600 text-xs">
                                          {formatDateTime(run.createdAt)}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRun(run.id);
                                          }}
                                          className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
