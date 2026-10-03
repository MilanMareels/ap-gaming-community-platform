'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader, ExternalLink, Timer, Plus, Video } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';

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
  coverImageUrl: string | null;
  hasInGameTimer: boolean;
  categories: Category[];
  levels: Level[];
  variables: Variable[];
}

interface LeaderboardEntry {
  rank: number;
  id: number;
  timeMs: number;
  inGameTimeMs: number | null;
  videoUrl: string;
  runDate: string;
  players: { userId: number | null; guestName: string | null; user: { id: number; name: string | null } | null }[];
  variableValues: { variable: { id: number; name: string }; value: { id: number; label: string } }[];
}

interface LeaderboardResponse {
  game: { id: number; name: string; slug: string; hasInGameTimer: boolean };
  category: { id: number; name: string; type: string };
  entries: LeaderboardEntry[];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function getPlayerName(p: LeaderboardEntry['players'][0]): string {
  return p.user?.name || p.guestName || 'Unknown';
}

export default function SpeedrunGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);

  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [subcategoryFilters, setSubcategoryFilters] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.GET('/speedruns/games/{slug}' as any, {
        params: { path: { slug } },
      });
      if (res.data) {
        const g = res.data as Game;
        setGame(g);
        if (g.categories.length > 0) {
          setSelectedCategory(g.categories[0].id);
          // Set default subcategory filters
          const defaults: Record<number, number> = {};
          for (const v of g.variables) {
            if (v.isSubcategory) {
              const defaultVal = v.values.find((val) => val.isDefault) || v.values[0];
              if (defaultVal) defaults[v.id] = defaultVal.id;
            }
          }
          setSubcategoryFilters(defaults);

          // Set default level for per-level categories
          const firstCat = g.categories[0];
          if (firstCat.type === 'PER_LEVEL' && g.levels.length > 0) {
            setSelectedLevel(g.levels[0].id);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const fetchLeaderboard = useCallback(async () => {
    if (!game || !selectedCategory) return;
    const category = game.categories.find((c) => c.id === selectedCategory);
    if (!category) return;

    if (category.type === 'PER_LEVEL' && !selectedLevel) return;

    setLbLoading(true);
    const queryParams: Record<string, string> = {
      categoryId: selectedCategory.toString(),
    };
    if (selectedLevel && category.type === 'PER_LEVEL') {
      queryParams.levelId = selectedLevel.toString();
    }
    // Add subcategory filters
    for (const [varId, valueId] of Object.entries(subcategoryFilters)) {
      queryParams[`var-${varId}`] = valueId.toString();
    }

    const res = await apiClient.GET('/speedruns/games/{slug}/leaderboard' as any, {
      params: {
        path: { slug: game.slug },
        query: queryParams,
      },
    });
    if (res.data) {
      setLeaderboard(res.data as LeaderboardResponse);
    }
    setLbLoading(false);
  }, [game, selectedCategory, selectedLevel, subcategoryFilters]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleCategoryChange = (catId: number) => {
    setSelectedCategory(catId);
    const category = game?.categories.find((c) => c.id === catId);
    if (category?.type === 'PER_LEVEL' && game && game.levels.length > 0) {
      setSelectedLevel(game.levels[0].id);
    } else {
      setSelectedLevel(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-4">
          <Loader className="text-[#d42422] animate-bounce" size={32} />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p className="text-xl">Game not found.</p>
      </div>
    );
  }

  const currentCategory = game.categories.find((c) => c.id === selectedCategory);

  // Get applicable variables for current category
  const applicableVariables = game.variables.filter((v) => {
    if (v.categoryId && v.categoryId !== selectedCategory) return false;
    if (currentCategory) {
      if (v.scope === 'FULL_GAME' && currentCategory.type !== 'FULL_GAME') return false;
      if (v.scope === 'PER_LEVEL' && currentCategory.type !== 'PER_LEVEL') return false;
    }
    return true;
  });

  const subcategoryVars = applicableVariables.filter((v) => v.isSubcategory);
  const metadataVars = applicableVariables.filter((v) => !v.isSubcategory);

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <ScrollReveal direction="up">
          {/* Header */}
          <div className="mb-8">
            <Link href="/speedruns" className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
              <ArrowLeft size={14} /> All Games
            </Link>
            <div className="flex items-start gap-6">
              {game.coverImageUrl && (
                <img
                  src={`/api/${game.coverImageUrl}`}
                  alt={game.name}
                  className="w-24 h-24 rounded-2xl object-cover border border-white/10 hidden md:block"
                />
              )}
              <div className="flex-1">
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
                  {game.name}
                </h1>
                {game.description && (
                  <p className="text-gray-400 mt-2">{game.description}</p>
                )}
              </div>
              <Link href={`/speedruns/${game.slug}/submit`}>
                <button className="bg-[#d42422] hover:bg-[#b81e1c] text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
                  <Plus size={18} /> Submit Run
                </button>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Category Tabs */}
        {game.categories.length > 0 && (
          <div className="border-b border-white/10 mb-6 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {game.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'text-white border-b-2 border-[#d42422]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level selector for per-level categories */}
        {currentCategory?.type === 'PER_LEVEL' && game.levels.length > 0 && (
          <div className="mb-4">
            <select
              className="bg-[#0a0f25] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#d42422] transition-colors"
              value={selectedLevel ?? ''}
              onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
            >
              {game.levels.map((level) => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subcategory filters */}
        {subcategoryVars.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-6">
            {subcategoryVars.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase font-bold">{v.name}:</span>
                <div className="flex gap-1">
                  {v.values.map((val) => (
                    <button
                      key={val.id}
                      onClick={() => setSubcategoryFilters({ ...subcategoryFilters, [v.id]: val.id })}
                      className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                        subcategoryFilters[v.id] === val.id
                          ? 'bg-[#d42422] text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-[#0a0f25] border border-white/10 rounded-[2rem] overflow-hidden">
          {lbLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="text-[#d42422] animate-spin" size={24} />
            </div>
          ) : leaderboard && leaderboard.entries.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider w-16">#</th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider">Player(s)</th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider">
                    <div className="flex items-center gap-1"><Timer size={12} /> Time</div>
                  </th>
                  {game.hasInGameTimer && (
                    <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider">IGT</th>
                  )}
                  {metadataVars.map((v) => (
                    <th key={v.id} className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider hidden lg:table-cell">
                      {v.name}
                    </th>
                  ))}
                  <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase font-bold tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className={`font-black italic text-lg ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-gray-300' :
                        entry.rank === 3 ? 'text-amber-600' : 'text-gray-600'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/speedruns/${game.slug}/run/${entry.id}`} className="font-bold text-white hover:text-[#d42422] transition-colors">
                        {entry.players.map(getPlayerName).join(' & ')}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/speedruns/${game.slug}/run/${entry.id}`} className="font-mono font-bold text-white hover:text-[#d42422] transition-colors">
                        {formatTime(entry.timeMs)}
                      </Link>
                    </td>
                    {game.hasInGameTimer && (
                      <td className="px-6 py-4 font-mono text-sm text-gray-400">
                        {entry.inGameTimeMs ? formatTime(entry.inGameTimeMs) : '-'}
                      </td>
                    )}
                    {metadataVars.map((v) => {
                      const vv = entry.variableValues.find((rv) => rv.variable.id === v.id);
                      return (
                        <td key={v.id} className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell">
                          {vv?.value.label || '-'}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(entry.runDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {entry.videoUrl && (
                        <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#d42422] transition-colors">
                          <Video size={16} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-16">
              <Timer size={32} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No runs yet for this category.</p>
              <Link href={`/speedruns/${game.slug}/submit`} className="text-[#d42422] hover:underline text-sm mt-2 inline-block">
                Be the first to submit a run!
              </Link>
            </div>
          )}
        </div>

        {/* Category rules */}
        {currentCategory?.rules && (
          <div className="mt-6 bg-[#0a0f25] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Category Rules</h3>
            <p className="text-gray-300 whitespace-pre-wrap text-sm">{currentCategory.rules}</p>
          </div>
        )}
      </div>
    </div>
  );
}
