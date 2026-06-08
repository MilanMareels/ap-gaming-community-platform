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

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    sNumber: '',
    handle: '',
    role: '',
    rank: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());

  async function fetchData() {
    try {
      const [gamesRes, entriesRes] = await Promise.all([apiClient.GET('/roster/games', {}), apiClient.GET('/roster/entries', {})]);
      if (gamesRes.data) {
        const g = gamesRes.data as RosterGame[];
        setGames(g);
        if (g.length > 0 && selectedGameId === null) {
          setSelectedGameId(g[0].id);
        }
      }
      if (entriesRes.data) setEntries(entriesRes.data as RosterEntryWithRelations[]);
    } catch (err) {
      console.error('Failed to fetch roster data:', err);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!confirm('Weet je zeker dat je deze game wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/roster/games/{id}', {
        params: { path: { id: id.toString() } },
      });
      if (selectedGameId === id) setSelectedGameId(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedGameId || !newPlayer.name.trim() || !newPlayer.sNumber.trim() || !newPlayer.handle.trim()) return;
    try {
      const formData = new FormData();
      formData.append('name', newPlayer.name);
      formData.append('sNumber', newPlayer.sNumber);
      formData.append('handle', newPlayer.handle);
      formData.append('rank', newPlayer.rank);
      formData.append('gameId', selectedGameId.toString());

      const trimmedRole = newPlayer.role.trim();
      if (trimmedRole) {
        formData.append('role', trimmedRole);
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await apiClient.POST('/roster/entries', {
        body: formData as any,
      });

      setNewPlayer({ name: '', sNumber: '', handle: '', role: '', rank: '' });
      setImageFile(null);
      setFileInputKey(Date.now());

      await fetchData();
    } catch (err) {
      console.error('Failed to add player:', err);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/roster/entries/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const filteredEntries = entries.filter((e) => e.game.id === selectedGameId);
  const selectedGame = games.find((g) => g.id === selectedGameId);

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold mb-4">Roster Games</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Game naam"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
            value={newGame}
            onChange={(e) => setNewGame(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
          />
          <Button onClick={handleCreateGame}>
            <Plus size={16} /> Toevoegen
          </Button>
        </div>
        <div className="space-y-2">
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => setSelectedGameId(game.id)}
              className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all border ${
                selectedGameId === game.id
                  ? 'bg-red-600/10 border-red-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-gray-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="font-bold">{game.name}</span>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGame(game.id);
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {games.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Nog geen games. Voeg er een toe hierboven.</p>}
        </div>
      </div>

      {selectedGame && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
            <h3 className="font-bold mb-4">Speler Toevoegen</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Game</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                  value={selectedGameId ?? ''}
                  onChange={(e) => setSelectedGameId(Number(e.target.value))}
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Naam"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              />
              <input
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                placeholder="S-nummer (bv. s123456)"
                value={newPlayer.sNumber}
                onChange={(e) => setNewPlayer({ ...newPlayer, sNumber: e.target.value })}
              />
              <input
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Gamer Tag"
                value={newPlayer.handle}
                onChange={(e) => setNewPlayer({ ...newPlayer, handle: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                  placeholder="Rol (optioneel)"
                  value={newPlayer.role}
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                />
                <input
                  className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors"
                  placeholder="Rank"
                  value={newPlayer.rank}
                  onChange={(e) => setNewPlayer({ ...newPlayer, rank: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Profielfoto (Optioneel)</label>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-sm file:font-semibold
                    file:bg-slate-800 file:text-white
                    hover:file:bg-slate-700
                    cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <button onClick={handleAddPlayer} className="w-full bg-blue-600 font-bold py-3 mt-2 rounded-xl hover:bg-blue-500 transition-colors">
                Toevoegen
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xl font-bold text-red-500 mb-2">{selectedGame.name} Roster</h3>
            {filteredEntries.length === 0 ? (
              <div className="text-center text-gray-500 italic py-8 bg-slate-900 rounded-xl border border-slate-800">Geen spelers in dit team.</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-4">
                    {entry.imageUrl ? (
                      <img
                        src={`/api/${entry.imageUrl}`}
                        alt={entry.handle}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs text-gray-500 font-bold">
                        {entry.handle.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-white">{entry.handle}</span>{' '}
                      <span className="text-gray-500 text-sm">
                        ({entry.user.name || entry.user.sNumber}
                        {entry.role ? ` — ${entry.role}` : ''})
                      </span>
                      {entry.rank && <span className="ml-2 text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded">{entry.rank}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:bg-red-900/20 p-2 rounded transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
