'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Gamepad2, Users, X, Search, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';
import type { RosterGame, RosterEntryWithRelations } from '@/api';

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

interface PlayerFormState {
  name: string;
  sNumber: string;
  handle: string;
  role: string;
  rank: string;
}

const emptyPlayerForm: PlayerFormState = { name: '', sNumber: '', handle: '', role: '', rank: '' };

export default function AdminRosterPage() {
  const [games, setGames] = useState<RosterGame[]>([]);
  const [entries, setEntries] = useState<RosterEntryWithRelations[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntryWithRelations | null>(null);
  const [newGameName, setNewGameName] = useState('');
  const [playerForm, setPlayerForm] = useState<PlayerFormState>(emptyPlayerForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);

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
    if (!newGameName.trim()) return;
    setSaving(true);
    try {
      await apiClient.POST('/roster/games', { body: { name: newGameName } });
      setNewGameName('');
      setGameModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create game:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze game en alle teamleden wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/roster/games/{id}', {
        params: { path: { id: id.toString() } },
      });
      if (selectedGameId === id) {
        const remaining = games.filter((g) => g.id !== id);
        setSelectedGameId(remaining.length > 0 ? remaining[0].id : null);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setPlayerForm(emptyPlayerForm);
    setImageFile(null);
    setFileInputKey(Date.now());
    setPlayerModalOpen(true);
  };

  const openEditModal = (entry: RosterEntryWithRelations) => {
    setEditingEntry(entry);
    setPlayerForm({
      name: entry.user.name || '',
      sNumber: entry.user.sNumber || '',
      handle: entry.handle,
      role: entry.role || '',
      rank: entry.rank || '',
    });
    setImageFile(null);
    setFileInputKey(Date.now());
    setPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setPlayerModalOpen(false);
    setEditingEntry(null);
    setPlayerForm(emptyPlayerForm);
  };

  const handleSubmitPlayer = async () => {
    if (editingEntry) {
      // Update existing
      setSaving(true);
      try {
        const formData = new FormData();
        formData.append('handle', playerForm.handle);
        formData.append('rank', playerForm.rank);
        formData.append('role', playerForm.role);
        if (imageFile) formData.append('image', imageFile);

        await apiClient.PATCH('/roster/entries/{id}' as any, {
          params: { path: { id: editingEntry.id.toString() } },
          body: formData as any,
        });

        closePlayerModal();
        await fetchData();
      } catch (err) {
        console.error('Failed to update player:', err);
      } finally {
        setSaving(false);
      }
    } else {
      // Create new
      if (!selectedGameId || !playerForm.name.trim() || !playerForm.sNumber.trim() || !playerForm.handle.trim()) return;
      setSaving(true);
      try {
        const formData = new FormData();
        formData.append('name', playerForm.name);
        formData.append('sNumber', playerForm.sNumber);
        formData.append('handle', playerForm.handle);
        formData.append('rank', playerForm.rank);
        formData.append('gameId', selectedGameId.toString());

        const trimmedRole = playerForm.role.trim();
        if (trimmedRole) formData.append('role', trimmedRole);
        if (imageFile) formData.append('image', imageFile);

        await apiClient.POST('/roster/entries', { body: formData as any });

        closePlayerModal();
        await fetchData();
      } catch (err) {
        console.error('Failed to add player:', err);
      } finally {
        setSaving(false);
      }
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

  const isEditing = editingEntry !== null;
  const selectedGame = games.find((g) => g.id === selectedGameId);
  const filteredEntries = entries
    .filter((e) => e.game.id === selectedGameId)
    .filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.handle.toLowerCase().includes(q) ||
        e.user.name?.toLowerCase().includes(q) ||
        e.user.sNumber?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q)
      );
    });

  return (
    <>
      <PageHeader
        title="Teams"
        description="Beheer games en teamleden."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setNewGameName(''); setGameModalOpen(true); }}>
              <Gamepad2 size={16} /> Nieuwe Game
            </Button>
            {selectedGame && (
              <Button size="sm" variant="primary" onClick={openCreateModal}>
                <Plus size={16} /> Speler Toevoegen
              </Button>
            )}
          </div>
        }
      />

      {/* Game tabs */}
      {games.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {games.map((game) => (
            <div
              key={game.id}
              role="button"
              tabIndex={0}
              onClick={() => { setSelectedGameId(game.id); setSearchQuery(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedGameId(game.id); setSearchQuery(''); } }}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                selectedGameId === game.id
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Gamepad2 size={14} />
              {game.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedGameId === game.id ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-gray-500'
              }`}>
                {entries.filter((e) => e.game.id === game.id).length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                className="p-0.5 rounded text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Verwijder game"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Player list */}
      {games.length === 0 ? (
        <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800">
          <EmptyState
            icon={Gamepad2}
            title="Nog geen games"
            description="Voeg een game toe om te beginnen met het samenstellen van teams."
            action={
              <Button size="sm" variant="primary" onClick={() => { setNewGameName(''); setGameModalOpen(true); }}>
                <Plus size={16} /> Eerste Game Toevoegen
              </Button>
            }
          />
        </div>
      ) : selectedGame ? (
        <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/50">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Zoek op naam, tag of rol..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500 ml-4">{filteredEntries.length} speler{filteredEntries.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-gray-500">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Speler</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Gamer Tag</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {entry.imageUrl ? (
                          <img
                            src={`/api/${entry.imageUrl}`}
                            alt={entry.handle}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-xs text-red-400 font-bold shrink-0">
                            {entry.handle.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{entry.user.name || entry.user.sNumber}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{entry.user.sNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white">{entry.handle}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {entry.role || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {entry.rank ? (
                        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg font-semibold">{entry.rank}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Bewerken"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Users}
                        title="Geen spelers gevonden"
                        description={searchQuery ? 'Pas je zoekopdracht aan.' : 'Voeg een speler toe aan dit team.'}
                        action={!searchQuery ? (
                          <Button size="sm" variant="primary" onClick={openCreateModal}>
                            <Plus size={16} /> Speler Toevoegen
                          </Button>
                        ) : undefined}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Add Game Modal */}
      {gameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGameModalOpen(false)} />
          <div className="relative bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div>
                <h3 className="text-lg font-bold text-white">Nieuwe Game</h3>
                <p className="text-xs text-gray-500 mt-0.5">Voeg een nieuwe game toe voor je teams.</p>
              </div>
              <button onClick={() => setGameModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className={labelClass}>Game naam *</label>
              <input
                className={inputClass}
                placeholder="bv. League of Legends"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-800/60 flex gap-3">
              <Button variant="primary" className="flex-1" onClick={handleCreateGame} disabled={saving || !newGameName.trim()}>
                <Plus size={16} /> {saving ? 'Toevoegen...' : 'Toevoegen'}
              </Button>
              <Button variant="secondary" onClick={() => setGameModalOpen(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Player Modal */}
      {playerModalOpen && selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePlayerModal} />
          <div className="relative bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">{isEditing ? 'Speler Bewerken' : 'Speler Toevoegen'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isEditing
                    ? <>Pas de gegevens aan van <span className="text-red-400 font-semibold">{editingEntry.handle}</span>.</>
                    : <>Voeg een nieuw teamlid toe aan <span className="text-red-400 font-semibold">{selectedGame.name}</span>.</>
                  }
                </p>
              </div>
              <button onClick={closePlayerModal} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {!isEditing && (
                <>
                  <div>
                    <label className={labelClass}>Naam *</label>
                    <input
                      className={inputClass}
                      placeholder="Volledige naam"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass}>S-nummer *</label>
                    <input
                      className={inputClass}
                      placeholder="bv. s123456"
                      value={playerForm.sNumber}
                      onChange={(e) => setPlayerForm({ ...playerForm, sNumber: e.target.value })}
                    />
                  </div>
                </>
              )}
              {isEditing && (
                <div className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl">
                  {editingEntry.imageUrl ? (
                    <img src={`/api/${editingEntry.imageUrl}`} alt={editingEntry.handle} className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-xs text-red-400 font-bold shrink-0">
                      {editingEntry.handle.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white text-sm">{editingEntry.user.name || editingEntry.user.sNumber}</div>
                    <div className="text-xs text-gray-500">{editingEntry.user.sNumber}</div>
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Gamer Tag *</label>
                <input
                  className={inputClass}
                  placeholder="In-game naam"
                  value={playerForm.handle}
                  onChange={(e) => setPlayerForm({ ...playerForm, handle: e.target.value })}
                  autoFocus={isEditing}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Rol</label>
                  <input
                    className={inputClass}
                    placeholder="bv. Support, Mid"
                    value={playerForm.role}
                    onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rank</label>
                  <input
                    className={inputClass}
                    placeholder="bv. Diamond"
                    value={playerForm.rank}
                    onChange={(e) => setPlayerForm({ ...playerForm, rank: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>{isEditing ? 'Profielfoto wijzigen' : 'Profielfoto'}</label>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
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
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-slate-800/60 bg-slate-900/95 backdrop-blur-sm rounded-b-2xl flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmitPlayer}
                disabled={saving || !playerForm.handle.trim() || (!isEditing && (!playerForm.name.trim() || !playerForm.sNumber.trim()))}
              >
                {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                {saving ? 'Opslaan...' : isEditing ? 'Wijzigingen Opslaan' : 'Speler Toevoegen'}
              </Button>
              <Button variant="secondary" onClick={closePlayerModal}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
