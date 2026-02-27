'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { RosterGame, RosterEntryWithRelations } from '@/api';

export default function AdminRosterPage() {
  const [games, setGames] = useState<RosterGame[]>([]);
  const [entries, setEntries] = useState<RosterEntryWithRelations[]>([]);
  const [newGame, setNewGame] = useState('');

  async function fetchData() {
    try {
      const [gamesRes, entriesRes] = await Promise.all([
        apiClient.GET('/roster/games', {}),
        apiClient.GET('/roster/entries', {}),
      ]);
      if (gamesRes.data) setGames(gamesRes.data as RosterGame[]);
      if (entriesRes.data)
        setEntries(entriesRes.data as RosterEntryWithRelations[]);
    } catch (err) {
      console.error('Failed to fetch roster data:', err);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGame = async () => {
    if (!newGame.trim()) return;
    try {
      await apiClient.POST('/roster/games', { body: { name: newGame } });
      setNewGame('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  const handleDeleteGame = async (id: number) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      await apiClient.DELETE('/roster/games/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await apiClient.DELETE('/roster/entries/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  return (
    <div className='space-y-8'>
      {/* Games */}
      <div className='bg-slate-900 rounded-xl border border-slate-800 p-6'>
        <h2 className='text-xl font-bold mb-4'>Roster Games</h2>
        <div className='flex gap-2 mb-4'>
          <input
            type='text'
            placeholder='Game naam'
            className='flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white'
            value={newGame}
            onChange={(e) => setNewGame(e.target.value)}
          />
          <Button onClick={handleCreateGame}>
            <Plus size={16} /> Add Game
          </Button>
        </div>
        <div className='space-y-2'>
          {games.map((game) => (
            <div
              key={game.id}
              className='flex justify-between items-center bg-slate-950 p-3 rounded'
            >
              <span>{game.name}</span>
              <Button
                size='sm'
                variant='danger'
                onClick={() => handleDeleteGame(game.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className='bg-slate-900 rounded-xl border border-slate-800 p-6'>
        <h2 className='text-xl font-bold mb-4'>Roster Entries</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-slate-950 text-gray-500 uppercase'>
              <tr>
                <th className='p-4'>Game</th>
                <th className='p-4'>Player</th>
                <th className='p-4 text-right'>Action</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-800'>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className='p-4'>{entry.game.name}</td>
                  <td className='p-4'>{entry.user.email}</td>
                  <td className='p-4 text-right'>
                    <Button
                      size='sm'
                      variant='danger'
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
