'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Play,
  Trophy,
  Loader2,
  Users,
  GripVertical,
} from 'lucide-react';
import { apiClient } from '@/api';
import type { Event } from '@/api';
import { BracketSVG, type BracketData } from '@/components/bracket/BracketSVG';

type EventWithCount = Event & { _count?: { registrations: number } };

interface ScoreModalState {
  matchId: number;
  participants: Array<{
    participantId: number;
    name: string;
    score: string;
  }>;
}

export default function AdminBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id;

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scoreModal, setScoreModal] = useState<ScoreModalState | null>(null);
  const [submittingScore, setSubmittingScore] = useState(false);

  // Create bracket form
  const [playersPerMatch, setPlayersPerMatch] = useState(2);
  const [advancingPerMatch, setAdvancingPerMatch] = useState(1);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);

  // Add participant form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const loadData = async () => {
    try {
      const [eventRes, bracketRes] = await Promise.all([
        apiClient.GET('/events/{id}', { params: { path: { id: eventId } } }),
        apiClient.GET('/events/{eventId}/bracket', {
          params: { path: { eventId } },
        }),
      ]);
      if (eventRes.data)
        setEvent(eventRes.data as unknown as EventWithCount);
      if (bracketRes.data)
        setBracket(bracketRes.data as unknown as BracketData);
      else setBracket(null);
    } catch {
      // Bracket might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleCreateBracket = async () => {
    setCreating(true);
    try {
      await apiClient.POST('/events/{eventId}/bracket', {
        params: { path: { eventId } },
        body: { playersPerMatch, advancingPerMatch, thirdPlaceMatch },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create bracket:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBracket = async () => {
    if (!confirm('Bracket verwijderen? Dit verwijdert alle matches en deelnemers.'))
      return;
    try {
      await apiClient.DELETE('/events/{eventId}/bracket', {
        params: { path: { eventId } },
      });
      setBracket(null);
    } catch (err) {
      console.error('Failed to delete bracket:', err);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiClient.POST('/events/{eventId}/bracket/participants', {
        params: { path: { eventId } },
        body: {
          name: newName.trim(),
          email: newEmail.trim() || undefined,
        },
      });
      setNewName('');
      setNewEmail('');
      await loadData();
    } catch (err) {
      console.error('Failed to add participant:', err);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    try {
      await apiClient.DELETE(
        '/events/{eventId}/bracket/participants/{participantId}',
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

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await apiClient.POST(
        '/events/{eventId}/bracket/participants/import',
        { params: { path: { eventId } } },
      );
      await loadData();
      if (res.data) {
        const data = res.data as unknown as { imported: number };
        alert(`${data.imported} deelnemer(s) geïmporteerd.`);
      }
    } catch (err) {
      console.error('Failed to import participants:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleGenerate = async () => {
    if (
      !confirm(
        'Bracket genereren? Deelnemers kunnen daarna niet meer worden gewijzigd.',
      )
    )
      return;
    setGenerating(true);
    try {
      await apiClient.POST('/events/{eventId}/bracket/generate', {
        params: { path: { eventId } },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to generate bracket:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapParticipants = async (
    participantAId: number,
    participantBId: number,
  ) => {
    try {
      await apiClient.POST('/events/{eventId}/bracket/swap-participants', {
        params: { path: { eventId } },
        body: { participantAId, participantBId },
      });
      await loadData();
    } catch (err) {
      console.error('Failed to swap participants:', err);
    }
  };

  const handleMatchClick = (matchId: number) => {
    if (!bracket) return;
    const match = bracket.matches.find((m) => m.id === matchId);
    if (!match || match.status === 'BYE' || match.status === 'COMPLETED')
      return;

    const realParticipants = match.participants.filter(
      (p) => !p.isBye && p.participant,
    );
    if (realParticipants.length < 2) return;

    setScoreModal({
      matchId,
      participants: realParticipants.map((p) => ({
        participantId: p.participantId!,
        name: p.participant?.name ?? 'Onbekend',
        score: p.score?.toString() ?? '',
      })),
    });
  };

  const handleSubmitScore = async () => {
    if (!scoreModal) return;
    setSubmittingScore(true);
    try {
      await apiClient.POST(
        '/events/{eventId}/bracket/matches/{matchId}/result',
        {
          params: {
            path: { eventId, matchId: String(scoreModal.matchId) },
          },
          body: {
            results: scoreModal.participants.map((p) => ({
              participantId: p.participantId,
              score: parseInt(p.score) || 0,
            })),
          },
        },
      );
      setScoreModal(null);
      await loadData();
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setSubmittingScore(false);
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

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Concept',
    GENERATED: 'Gegenereerd',
    IN_PROGRESS: 'Bezig',
    COMPLETED: 'Afgelopen',
  };

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-500/15 text-gray-400',
    GENERATED: 'bg-blue-500/15 text-blue-400',
    IN_PROGRESS: 'bg-red-500/15 text-red-400',
    COMPLETED: 'bg-green-500/15 text-green-400',
  };

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
            Bracket Toernooi
          </span>
          {bracket && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_COLORS[bracket.status]}`}
            >
              {STATUS_LABELS[bracket.status]}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-gray-400 text-sm">{event.description}</p>
        )}
      </div>

      {/* No bracket yet - create form */}
      {!bracket && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-red-500" />
            Bracket aanmaken
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1 font-bold">
                Spelers per match
              </label>
              <input
                type="number"
                min={2}
                max={16}
                value={playersPerMatch}
                onChange={(e) => setPlayersPerMatch(+e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1 font-bold">
                Doorgang per match
              </label>
              <input
                type="number"
                min={1}
                max={playersPerMatch - 1}
                value={advancingPerMatch}
                onChange={(e) => setAdvancingPerMatch(+e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thirdPlaceMatch}
                  onChange={(e) => setThirdPlaceMatch(e.target.checked)}
                  className="accent-red-600"
                />
                3e plaats match
              </label>
            </div>
          </div>
          <button
            onClick={handleCreateBracket}
            disabled={creating}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
          >
            {creating ? 'Aanmaken...' : 'Bracket aanmaken'}
          </button>
        </div>
      )}

      {/* Bracket exists */}
      {bracket && (
        <>
          {/* DRAFT: Participant management */}
          {bracket.status === 'DRAFT' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Users size={16} className="text-red-500" />
                  Deelnemers ({bracket.participants.length})
                </h3>
                <div className="flex gap-2">
                  {event.registrationEnabled && (
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {importing
                        ? 'Importeren...'
                        : 'Importeer uit inschrijvingen'}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteBracket}
                    className="bg-slate-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={12} /> Bracket verwijderen
                  </button>
                </div>
              </div>

              {/* Add participant form */}
              <form
                onSubmit={handleAddParticipant}
                className="flex gap-2 mb-4"
              >
                <input
                  type="text"
                  placeholder="Naam"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
                  required
                />
                <input
                  type="email"
                  placeholder="E-mail (optioneel)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Toevoegen
                </button>
              </form>

              {/* Participant list */}
              {bracket.participants.length === 0 ? (
                <p className="text-gray-500 italic text-sm text-center py-4">
                  Nog geen deelnemers.
                </p>
              ) : (
                <div className="space-y-1 mb-4">
                  {bracket.participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 group"
                    >
                      <GripVertical
                        size={14}
                        className="text-gray-600"
                      />
                      <span className="text-gray-500 text-xs font-bold w-6">
                        {idx + 1}
                      </span>
                      <span className="text-white font-medium text-sm flex-1">
                        {p.name}
                      </span>
                      {p.email && (
                        <span className="text-gray-500 text-xs">
                          {p.email}
                        </span>
                      )}
                      {p.userId && (
                        <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">
                          Gebruiker
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Generate button */}
              {bracket.participants.length >= 2 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Play size={16} />
                  {generating
                    ? 'Genereren...'
                    : `Bracket genereren (${bracket.participants.length} deelnemers)`}
                </button>
              )}
            </div>
          )}

          {/* GENERATED / IN_PROGRESS / COMPLETED: Bracket view */}
          {bracket.status !== 'DRAFT' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Trophy size={16} className="text-red-500" />
                  Bracket
                  {bracket.status === 'GENERATED' && (
                    <span className="text-xs text-gray-500 font-normal">
                      (sleep deelnemers om te wisselen, klik op een match om scores in te voeren)
                    </span>
                  )}
                  {bracket.status !== 'DRAFT' && bracket.status !== 'GENERATED' && (
                    <span className="text-xs text-gray-500 font-normal">
                      (klik op een match om scores in te voeren)
                    </span>
                  )}
                </h3>
                <button
                  onClick={handleDeleteBracket}
                  className="bg-slate-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={12} /> Verwijderen
                </button>
              </div>

              <BracketSVG
                bracket={bracket}
                onMatchClick={handleMatchClick}
                onSwapParticipants={handleSwapParticipants}
                mode="admin"
              />
            </div>
          )}
        </>
      )}

      {/* Score entry modal */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">Score invoeren</h3>
            <div className="space-y-3 mb-6">
              {scoreModal.participants.map((p, idx) => (
                <div key={p.participantId} className="flex items-center gap-3">
                  <span className="text-white font-medium text-sm flex-1">
                    {p.name}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={p.score}
                    onChange={(e) => {
                      const updated = [...scoreModal.participants];
                      updated[idx] = { ...updated[idx], score: e.target.value };
                      setScoreModal({ ...scoreModal, participants: updated });
                    }}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-bold"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setScoreModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={submittingScore}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
              >
                {submittingScore ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
