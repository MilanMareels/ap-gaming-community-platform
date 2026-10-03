'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader, Plus, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import { TimeInput } from '@/components/speedruns/TimeInput';
import { RichTextEditor } from '@/components/speedruns/RichTextEditor';

interface VariableValue {
  id: number;
  label: string;
  isDefault: boolean;
  position: number;
}

interface Variable {
  id: number;
  name: string;
  isSubcategory: boolean;
  isMandatory: boolean;
  scope: 'GLOBAL' | 'FULL_GAME' | 'PER_LEVEL';
  categoryId: number | null;
  position: number;
  values: VariableValue[];
}

interface Category {
  id: number;
  name: string;
  rules: string | null;
  type: 'FULL_GAME' | 'PER_LEVEL';
  playerType: string;
  playerCount: number;
  position: number;
}

interface Level {
  id: number;
  name: string;
  position: number;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  hasInGameTimer: boolean;
  categories: Category[];
  levels: Level[];
  variables: Variable[];
}

interface PlayerEntry {
  type: 'user' | 'guest';
  userId?: number;
  guestName?: string;
}

export default function SubmitRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [inGameTimeMs, setInGameTimeMs] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [runDateType, setRunDateType] = useState<'now' | 'custom'>('now');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [players, setPlayers] = useState<PlayerEntry[]>([{ type: 'guest', guestName: '' }]);
  const [variableValues, setVariableValues] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.GET('/speedruns/games/{slug}' as any, {
        params: { path: { slug } },
      });
      if (res.data) {
        const g = res.data as Game;
        setGame(g);
        if (g.categories.length > 0) {
          setCategoryId(g.categories[0].id);
          if (g.categories[0].type === 'PER_LEVEL' && g.levels.length > 0) {
            setLevelId(g.levels[0].id);
          }
        }
        // Set default variable values
        const defaults: Record<number, number> = {};
        for (const v of g.variables) {
          const defaultVal = v.values.find((val) => val.isDefault) || (v.isMandatory ? v.values[0] : undefined);
          if (defaultVal) defaults[v.id] = defaultVal.id;
        }
        setVariableValues(defaults);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader className="text-[#d42422] animate-spin" size={32} />
      </div>
    );
  }

  const currentCategory = game.categories.find((c) => c.id === categoryId);

  // Get applicable variables for current category
  const applicableVariables = game.variables.filter((v) => {
    if (v.categoryId && v.categoryId !== categoryId) return false;
    if (currentCategory) {
      if (v.scope === 'FULL_GAME' && currentCategory.type !== 'FULL_GAME') return false;
      if (v.scope === 'PER_LEVEL' && currentCategory.type !== 'PER_LEVEL') return false;
    }
    return true;
  });

  const handleCategoryChange = (id: number) => {
    setCategoryId(id);
    const cat = game.categories.find((c) => c.id === id);
    if (cat?.type === 'PER_LEVEL' && game.levels.length > 0) {
      setLevelId(game.levels[0].id);
    } else {
      setLevelId(null);
    }
  };

  const handleAddPlayer = () => {
    setPlayers([...players, { type: 'guest', guestName: '' }]);
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length <= 1) return;
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    if (!categoryId) { setError('Please select a category'); return; }
    if (timeMs <= 0) { setError('Please enter a valid time'); return; }
    if (!videoUrl.trim()) { setError('Please provide a video URL'); return; }

    const runDate = runDateType === 'now'
      ? new Date().toISOString().split('T')[0]
      : customDate;

    const body: any = {
      gameId: game.id,
      categoryId,
      levelId: currentCategory?.type === 'PER_LEVEL' ? levelId : undefined,
      timeMs,
      inGameTimeMs: game.hasInGameTimer && inGameTimeMs > 0 ? inGameTimeMs : undefined,
      videoUrl: videoUrl.trim(),
      description: description.trim() || undefined,
      runDate,
      players: players.map((p) => {
        if (p.type === 'user' && p.userId) return { userId: p.userId };
        return { guestName: p.guestName || 'Unknown' };
      }),
      variableValues: Object.entries(variableValues)
        .filter(([, valueId]) => valueId)
        .map(([varId, valueId]) => ({
          variableId: parseInt(varId),
          valueId,
        })),
    };

    setSubmitting(true);
    try {
      const res = await apiClient.POST('/speedruns/runs' as any, { body });
      if (res.error) {
        const errMsg = (res.error as any)?.message;
        setError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg || 'Failed to submit run');
        setSubmitting(false);
        return;
      }
      router.push(`/speedruns/${game.slug}`);
    } catch {
      setError('Failed to submit run');
      setSubmitting(false);
    }
  };

  const maxPlayers = currentCategory?.playerCount ?? 1;
  const playerTypeLabel = currentCategory?.playerType === 'up_to' ? `Up to ${maxPlayers}` : `Exactly ${maxPlayers}`;

  return (
    <div className="min-h-screen py-24 px-6">
      <div className="container mx-auto max-w-3xl">
        <Link href={`/speedruns/${game.slug}`} className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to {game.name}
        </Link>

        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white uppercase mb-8">
          Submit Run &mdash; {game.name}
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Category */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white">Category</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Category *</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                  value={categoryId ?? ''}
                  onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                >
                  {game.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type === 'FULL_GAME' ? 'Full Game' : 'Per Level'})
                    </option>
                  ))}
                </select>
              </div>

              {currentCategory?.type === 'PER_LEVEL' && (
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Level *</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                    value={levelId ?? ''}
                    onChange={(e) => setLevelId(parseInt(e.target.value))}
                  >
                    {game.levels.map((level) => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Variable values (categorization + details) */}
          {applicableVariables.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-bold text-white">Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {applicableVariables.map((v) => (
                  <div key={v.id}>
                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">
                      {v.name} {v.isMandatory && '*'}
                      {v.isSubcategory && <span className="text-red-400 ml-1">(subcategory)</span>}
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                      value={variableValues[v.id] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        setVariableValues({ ...variableValues, [v.id]: val as number });
                      }}
                    >
                      {!v.isMandatory && <option value="">— None —</option>}
                      {v.values.map((val) => (
                        <option key={val.id} value={val.id}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Players */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Players</h3>
              <span className="text-xs text-gray-500">{playerTypeLabel} player(s)</span>
            </div>
            <div className="space-y-3">
              {players.map((player, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">
                      Player {i + 1} Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                      placeholder="Player name"
                      value={player.guestName || ''}
                      onChange={(e) => {
                        const updated = [...players];
                        updated[i] = { type: 'guest', guestName: e.target.value };
                        setPlayers(updated);
                      }}
                    />
                  </div>
                  {players.length > 1 && (
                    <Button size="sm" variant="danger" onClick={() => handleRemovePlayer(i)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {players.length < maxPlayers && (
              <button onClick={handleAddPlayer} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                <Plus size={14} /> Add Player
              </button>
            )}
          </div>

          {/* Times */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white">Time</h3>
            <TimeInput value={timeMs} onChange={setTimeMs} label="Speedrun Time" required />
            {game.hasInGameTimer && (
              <TimeInput value={inGameTimeMs} onChange={setInGameTimeMs} label="In-Game Time" required />
            )}
          </div>

          {/* Run Date */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white">Run Date</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  className="accent-red-600"
                  checked={runDateType === 'now'}
                  onChange={() => setRunDateType('now')}
                />
                <span className="text-sm text-gray-300">Just finished</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  className="accent-red-600"
                  checked={runDateType === 'custom'}
                  onChange={() => setRunDateType('custom')}
                />
                <span className="text-sm text-gray-300">Custom date</span>
              </label>
            </div>
            {runDateType === 'custom' && (
              <input
                type="date"
                className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}
          </div>

          {/* Video */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white">Video *</h3>
            <input
              type="url"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white">Description (optional)</h3>
            <RichTextEditor content={description} onChange={setDescription} />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 py-4 text-lg">
              <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Run'}
            </Button>
            <Link href={`/speedruns/${game.slug}`}>
              <Button variant="ghost" className="py-4">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
