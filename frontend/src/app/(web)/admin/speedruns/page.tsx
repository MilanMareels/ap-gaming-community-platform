'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import { useAdmin } from '../layout';
import Link from 'next/link';

interface SpeedrunGame {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  hasInGameTimer: boolean;
  _count: { runs: number; categories: number };
}

export default function AdminSpeedrunsPage() {
  const { hasPermission } = useAdmin();
  const canManage = hasPermission('speedruns.manage');
  const canReview = hasPermission('speedruns.review');

  const [games, setGames] = useState<SpeedrunGame[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', slug: '', description: '', hasInGameTimer: false });
  const [error, setError] = useState('');

  async function fetchGames() {
    const res = await apiClient.GET('/speedruns/games', {});
    if (res.data) setGames(res.data as SpeedrunGame[]);
  }

  useEffect(() => {
    fetchGames();
  }, []);

  const handleSlugify = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateGame = async () => {
    if (!newGame.name.trim() || !newGame.slug.trim()) return;
    setError('');
    const res = await apiClient.POST('/speedruns/games' as any, {
      body: newGame as any,
    });
    if (res.error) {
      setError((res.error as any)?.message || 'Failed to create game');
      return;
    }
    setNewGame({ name: '', slug: '', description: '', hasInGameTimer: false });
    setShowCreate(false);
    await fetchGames();
  };

  const handleDeleteGame = async (id: number) => {
    if (!confirm('Are you sure you want to delete this game? All categories, variables, and runs will be deleted.')) return;
    await apiClient.DELETE('/speedruns/games/{id}' as any, {
      params: { path: { id: id.toString() } },
    });
    await fetchGames();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Speedrun Games</h2>
        <div className="flex gap-2">
          {canReview && (
            <Link href="/admin/speedruns/runs">
              <Button variant="secondary">Pending Runs</Button>
            </Link>
          )}
          {canManage && (
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus size={16} /> New Game
            </Button>
          )}
        </div>
      </div>

      {showCreate && canManage && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="font-bold">Create New Game</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Super Mario 64"
                value={newGame.name}
                onChange={(e) => {
                  setNewGame({
                    ...newGame,
                    name: e.target.value,
                    slug: handleSlugify(e.target.value),
                  });
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Slug (URL)</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                placeholder="super-mario-64"
                value={newGame.slug}
                onChange={(e) => setNewGame({ ...newGame, slug: handleSlugify(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description (optional)</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
              placeholder="A short description of the game"
              rows={2}
              value={newGame.description}
              onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-red-600"
              checked={newGame.hasInGameTimer}
              onChange={(e) => setNewGame({ ...newGame, hasInGameTimer: e.target.checked })}
            />
            <span className="text-sm text-gray-300">Game has an in-game timer</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={handleCreateGame}>Create Game</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-4">
              {game.coverImageUrl ? (
                <img
                  src={`/api/${game.coverImageUrl}`}
                  alt={game.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-gray-500 font-bold">
                  {game.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-white">{game.name}</h3>
                <p className="text-sm text-gray-500">
                  /{game.slug} &middot; {game._count.categories} categories &middot; {game._count.runs} runs
                  {game.hasInGameTimer && ' \u00b7 IGT'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/speedruns/${game.slug}`}>
                <Button size="sm" variant="ghost">
                  <ExternalLink size={16} />
                </Button>
              </Link>
              {canManage && (
                <>
                  <Link href={`/admin/speedruns/${game.id}`}>
                    <Button size="sm" variant="secondary">
                      <Settings size={16} /> Configure
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteGame(game.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8 bg-slate-900 rounded-xl border border-slate-800">
            No games yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
