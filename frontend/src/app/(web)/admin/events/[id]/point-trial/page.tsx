'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Hash,
  X,
} from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';

type EventWithCount = Event & { _count?: { registrations: number } };

interface PointTrialEntry {
  id: number;
  points: number;
  createdAt: string;
}

interface PointTrialParticipant {
  id: number;
  name: string;
  email: string | null;
  userId: number | null;
  bestPoints: number | null;
  entries: PointTrialEntry[];
  user: { id: number; name: string | null; email: string } | null;
}

interface PointTrial {
  id: number;
  eventId: number;
  status: 'ACTIVE' | 'COMPLETED';
  participants: PointTrialParticipant[];
}

interface Registration {
  id: number;
  user: { id: number; name: string | null; email: string; sNumber: string };
}

function formatPoints(pts: number): string {
  return pts.toLocaleString('nl-NL');
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

export default function AdminPointTrialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id;

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [pointTrial, setPointTrial] = useState<PointTrial | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Add participant + entry form
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [newPointsValue, setNewPointsValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add entry to existing participant
  const [addEntryParticipantId, setAddEntryParticipantId] = useState<number | null>(null);
  const [addEntryPointsValue, setAddEntryPointsValue] = useState('');

  // Expanded participant (show entry history)
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [eventRes, ptRes, regRes] = await Promise.all([
        apiClient.GET('/events/{id}', { params: { path: { id: eventId } } }),
        apiClient.GET('/events/{eventId}/point-trial', {
          params: { path: { eventId } },
        }),
        apiClient.GET('/events/{id}/registrations', {
          params: { path: { id: eventId } },
        }),
      ]);
      if (eventRes.data) setEvent(eventRes.data as unknown as EventWithCount);
      if (ptRes.data) setPointTrial(ptRes.data as unknown as PointTrial);
      else setPointTrial(null);
      if (regRes.data) setRegistrations(regRes.data as unknown as Registration[]);
    } catch {
      // Point trial might not exist yet
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
      await apiClient.POST('/events/{eventId}/point-trial', {
        params: { path: { eventId } },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create point trial:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Puntenklassement verwijderen? Dit verwijdert alle deelnemers en scores.')) return;
    try {
      await apiClient.DELETE('/events/{eventId}/point-trial', {
        params: { path: { eventId } },
      });
      setPointTrial(null);
    } catch (err) {
      console.error('Failed to delete point trial:', err);
    }
  };

  const handleStatusChange = async (status: 'ACTIVE' | 'COMPLETED') => {
    if (status === 'COMPLETED' && !confirm('Puntenklassement afronden?')) return;
    try {
      await apiClient.PATCH('/events/{eventId}/point-trial', {
        params: { path: { eventId } },
        body: { status },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const availableRegistrations = registrations.filter(
    (reg) => !pointTrial?.participants.some((p) => p.userId === reg.user.id),
  );

  const handleAddParticipantWithEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointTrial) return;

    const points = parseInt(newPointsValue);
    if (isNaN(points) || points < 0) {
      alert('Voer een geldig puntenaantal in (geheel getal >= 0)');
      return;
    }

    setSubmitting(true);
    try {
      let participantId: number | undefined;

      if (selectedRegistrationId) {
        const reg = registrations.find((r) => r.id === parseInt(selectedRegistrationId));
        if (!reg) return;

        const existing = pointTrial.participants.find((p) => p.userId === reg.user.id);
        if (existing) {
          participantId = existing.id;
        } else {
          const res = await apiClient.POST(
            '/events/{eventId}/point-trial/participants',
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
            participantId = (res.data as unknown as PointTrialParticipant).id;
          }
        }
      } else if (customName.trim()) {
        const res = await apiClient.POST(
          '/events/{eventId}/point-trial/participants',
          {
            params: { path: { eventId } },
            body: { name: customName.trim() },
          },
        );
        if (res.data) {
          participantId = (res.data as unknown as PointTrialParticipant).id;
        }
      }

      if (participantId) {
        await apiClient.POST(
          '/events/{eventId}/point-trial/participants/{participantId}/entries',
          {
            params: {
              path: { eventId, participantId: String(participantId) },
            },
            body: { points },
          },
        );
      }

      setSelectedRegistrationId('');
      setCustomName('');
      setNewPointsValue('');
      await loadData();
    } catch (err) {
      console.error('Failed to add participant/entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEntry = async (participantId: number) => {
    const points = parseInt(addEntryPointsValue);
    if (isNaN(points) || points < 0) {
      alert('Voer een geldig puntenaantal in (geheel getal >= 0)');
      return;
    }
    try {
      await apiClient.POST(
        '/events/{eventId}/point-trial/participants/{participantId}/entries',
        {
          params: {
            path: { eventId, participantId: String(participantId) },
          },
          body: { points },
        },
      );
      setAddEntryParticipantId(null);
      setAddEntryPointsValue('');
      await loadData();
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await apiClient.DELETE('/events/{eventId}/point-trial/entries/{entryId}', {
        params: { path: { eventId, entryId: String(entryId) } },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm('Deelnemer en alle scores verwijderen?')) return;
    try {
      await apiClient.DELETE(
        '/events/{eventId}/point-trial/participants/{participantId}',
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
        <Link href="/admin/events" className="text-red-500 hover:underline font-bold">
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
            Puntenklassement
          </span>
          {pointTrial && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_COLORS[pointTrial.status]}`}>
              {STATUS_LABELS[pointTrial.status]}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-gray-400 text-sm">{event.description}</p>
        )}
      </div>

      {/* No point trial yet */}
      {!pointTrial && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Star size={18} className="text-red-500" />
            Puntenklassement aanmaken
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Start een puntenklassement om scores bij te houden en een live ranglijst te tonen.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
          >
            {creating ? 'Aanmaken...' : 'Puntenklassement starten'}
          </button>
        </div>
      )}

      {/* Point trial exists */}
      {pointTrial && (
        <>
          {/* Add participant + points */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Plus size={16} className="text-red-500" />
              Score toevoegen
            </h3>
            <form onSubmit={handleAddParticipantWithEntry} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-50">
                <label className="block text-xs text-gray-400 mb-1 font-bold">Deelnemer</label>
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
                  placeholder={availableRegistrations.length > 0 ? 'Of typ een naam...' : 'Naam'}
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    if (e.target.value) setSelectedRegistrationId('');
                  }}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 ${availableRegistrations.length > 0 ? 'mt-2' : ''}`}
                />
              </div>
              <div className="w-32">
                <label className="block text-xs text-gray-400 mb-1 font-bold">Punten</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={newPointsValue}
                  onChange={(e) => setNewPointsValue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder:text-gray-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || (!selectedRegistrationId && !customName.trim()) || !newPointsValue}
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
                <Star size={16} className="text-red-500" />
                Ranglijst ({pointTrial.participants.length} deelnemers)
              </h3>
              <div className="flex gap-2">
                {pointTrial.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 size={12} /> Afronden
                  </button>
                )}
                {pointTrial.status === 'COMPLETED' && (
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

            {pointTrial.participants.length === 0 ? (
              <div className="text-center text-gray-500 italic py-8">
                Nog geen deelnemers. Voeg hierboven een score toe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3 font-bold w-12">#</th>
                      <th className="px-4 py-3 font-bold">Naam</th>
                      <th className="px-4 py-3 font-bold w-36">Beste score</th>
                      <th className="px-4 py-3 font-bold w-20">Pogingen</th>
                      <th className="px-4 py-3 font-bold w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointTrial.participants.map((participant, idx) => {
                      const hasBest = participant.bestPoints !== null;
                      const rank = hasBest ? idx + 1 : null;
                      const isExpanded = expandedParticipantId === participant.id;
                      const isAddingEntry = addEntryParticipantId === participant.id;

                      return (
                        <React.Fragment key={participant.id}>
                          <tr
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedParticipantId(isExpanded ? null : participant.id)}
                          >
                            <td className="px-4 py-3 text-gray-500 font-bold">{rank ?? '-'}</td>
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
                              <span className={`font-mono font-bold ${hasBest ? 'text-white' : 'text-gray-600'}`}>
                                {hasBest ? formatPoints(participant.bestPoints!) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{participant.entries.length}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddEntryParticipantId(isAddingEntry ? null : participant.id);
                                    setAddEntryPointsValue('');
                                  }}
                                  className="text-gray-500 hover:text-white transition-colors"
                                  title="Nieuwe score toevoegen"
                                >
                                  <Hash size={14} />
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
                                  <ChevronUp size={14} className="text-gray-500" />
                                ) : (
                                  <ChevronDown size={14} className="text-gray-500" />
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Add entry inline */}
                          {isAddingEntry && (
                            <tr className="border-b border-slate-800/50 bg-slate-800/20">
                              <td colSpan={5} className="px-4 py-3">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleAddEntry(participant.id);
                                  }}
                                  className="flex items-center gap-3"
                                >
                                  <span className="text-gray-400 text-xs font-bold">Nieuwe score:</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={addEntryPointsValue}
                                    onChange={(e) => setAddEntryPointsValue(e.target.value)}
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
                                      setAddEntryParticipantId(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-300 text-xs"
                                  >
                                    Annuleren
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}

                          {/* Expanded entry history */}
                          {isExpanded && participant.entries.length > 0 && (
                            <tr className="border-b border-slate-800/50">
                              <td colSpan={5} className="px-4 py-0">
                                <div className="py-3 pl-8 border-l-2 border-slate-700 ml-4">
                                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                    Alle scores
                                  </p>
                                  <div className="space-y-1">
                                    {participant.entries.map((entry, entryIdx) => (
                                      <div key={entry.id} className="flex items-center gap-4 text-sm group">
                                        <span className="text-gray-600 text-xs w-6">{entryIdx + 1}.</span>
                                        <span className={`font-mono ${entryIdx === 0 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                          {formatPoints(entry.points)} pts
                                        </span>
                                        {entryIdx === 0 && (
                                          <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">
                                            Beste
                                          </span>
                                        )}
                                        <span className="text-gray-600 text-xs">
                                          {formatDateTime(entry.createdAt)}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEntry(entry.id);
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
