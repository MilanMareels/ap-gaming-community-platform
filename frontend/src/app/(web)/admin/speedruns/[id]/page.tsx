'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import { useAdmin } from '../../layout';
import Link from 'next/link';

interface VariableValue {
  id?: number;
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

type TabId = 'general' | 'levels' | 'categories' | 'variables';

export default function AdminSpeedrunGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAdmin();
  const canManage = hasPermission('speedruns.manage');

  const [game, setGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);

  // General form state
  const [generalForm, setGeneralForm] = useState({ name: '', slug: '', description: '', hasInGameTimer: false });

  // Category form state
  const [newCategory, setNewCategory] = useState({ name: '', type: 'FULL_GAME' as const, playerType: 'exactly', playerCount: 1, rules: '' });
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', type: 'FULL_GAME' as string, playerType: 'exactly', playerCount: 1, rules: '' });

  // Level form state
  const [newLevelName, setNewLevelName] = useState('');

  // Variable form state
  const [showNewVariable, setShowNewVariable] = useState(false);
  const [newVariable, setNewVariable] = useState({
    name: '', isSubcategory: false, isMandatory: false, scope: 'GLOBAL' as string, categoryId: null as number | null,
    values: [{ label: '', isDefault: true }] as { label: string; isDefault: boolean }[],
  });
  const [editingVariable, setEditingVariable] = useState<number | null>(null);
  const [editVariableForm, setEditVariableForm] = useState({
    name: '', isSubcategory: false, isMandatory: false, scope: 'GLOBAL' as string, categoryId: null as number | null,
    values: [] as { label: string; isDefault: boolean }[],
  });

  async function fetchGame() {
    const res = await apiClient.GET('/speedruns/games/{slug}' as any, {
      params: { path: { slug: id } },
    });
    if (res.data) {
      const g = res.data as Game;
      setGame(g);
      setGeneralForm({
        name: g.name,
        slug: g.slug,
        description: g.description || '',
        hasInGameTimer: g.hasInGameTimer,
      });
    }
  }

  useEffect(() => {
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!game) {
    return <div className="text-gray-500">Loading...</div>;
  }

  // ── General Tab ──
  const handleSaveGeneral = async () => {
    setSaving(true);
    await apiClient.PATCH('/speedruns/games/{id}' as any, {
      params: { path: { id: game.id.toString() } },
      body: generalForm as any,
    });
    await fetchGame();
    setSaving(false);
  };

  const handleUploadCover = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    await apiClient.POST('/speedruns/games/{id}/cover' as any, {
      params: { path: { id: game.id.toString() } },
      body: formData as any,
    });
    await fetchGame();
  };

  // ── Categories Tab ──
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;
    await apiClient.POST('/speedruns/games/{gameId}/categories' as any, {
      params: { path: { gameId: game.id.toString() } },
      body: newCategory as any,
    });
    setNewCategory({ name: '', type: 'FULL_GAME', playerType: 'exactly', playerCount: 1, rules: '' });
    await fetchGame();
  };

  const handleUpdateCategory = async (catId: number) => {
    await apiClient.PATCH('/speedruns/games/{gameId}/categories/{id}' as any, {
      params: { path: { gameId: game.id.toString(), id: catId.toString() } },
      body: editCategoryForm as any,
    });
    setEditingCategory(null);
    await fetchGame();
  };

  const handleDeleteCategory = async (catId: number) => {
    if (!confirm('Delete this category? All associated runs will be deleted.')) return;
    await apiClient.DELETE('/speedruns/games/{gameId}/categories/{id}' as any, {
      params: { path: { gameId: game.id.toString(), id: catId.toString() } },
    });
    await fetchGame();
  };

  // ── Levels Tab ──
  const handleCreateLevel = async () => {
    if (!newLevelName.trim()) return;
    await apiClient.POST('/speedruns/games/{gameId}/levels' as any, {
      params: { path: { gameId: game.id.toString() } },
      body: { name: newLevelName } as any,
    });
    setNewLevelName('');
    await fetchGame();
  };

  const handleDeleteLevel = async (levelId: number) => {
    if (!confirm('Delete this level?')) return;
    await apiClient.DELETE('/speedruns/games/{gameId}/levels/{id}' as any, {
      params: { path: { gameId: game.id.toString(), id: levelId.toString() } },
    });
    await fetchGame();
  };

  // ── Variables Tab ──
  const handleCreateVariable = async () => {
    if (!newVariable.name.trim() || newVariable.values.length === 0) return;
    const validValues = newVariable.values.filter((v) => v.label.trim());
    if (validValues.length === 0) return;

    await apiClient.POST('/speedruns/games/{gameId}/variables' as any, {
      params: { path: { gameId: game.id.toString() } },
      body: {
        name: newVariable.name,
        isSubcategory: newVariable.isSubcategory,
        isMandatory: newVariable.isMandatory,
        scope: newVariable.scope,
        categoryId: newVariable.categoryId,
        values: validValues,
      } as any,
    });
    setNewVariable({
      name: '', isSubcategory: false, isMandatory: false, scope: 'GLOBAL', categoryId: null,
      values: [{ label: '', isDefault: true }],
    });
    setShowNewVariable(false);
    await fetchGame();
  };

  const handleUpdateVariable = async (varId: number) => {
    const validValues = editVariableForm.values.filter((v) => v.label.trim());
    if (validValues.length === 0) return;

    await apiClient.PATCH('/speedruns/games/{gameId}/variables/{id}' as any, {
      params: { path: { gameId: game.id.toString(), id: varId.toString() } },
      body: {
        name: editVariableForm.name,
        isSubcategory: editVariableForm.isSubcategory,
        isMandatory: editVariableForm.isMandatory,
        scope: editVariableForm.scope,
        categoryId: editVariableForm.categoryId,
        values: validValues,
      } as any,
    });
    setEditingVariable(null);
    await fetchGame();
  };

  const handleDeleteVariable = async (varId: number) => {
    if (!confirm('Delete this variable?')) return;
    await apiClient.DELETE('/speedruns/games/{gameId}/variables/{id}' as any, {
      params: { path: { gameId: game.id.toString(), id: varId.toString() } },
    });
    await fetchGame();
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'levels', label: 'Levels' },
    { id: 'categories', label: 'Categories' },
    { id: 'variables', label: 'Variables' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/speedruns">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Back</Button>
        </Link>
        <h2 className="text-xl font-bold">{game.name}</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-red-600'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                value={generalForm.name}
                onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Slug</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                value={generalForm.slug}
                onChange={(e) => setGeneralForm({ ...generalForm, slug: e.target.value })}
                disabled={!canManage}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
              rows={3}
              value={generalForm.description}
              onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
              disabled={!canManage}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-red-600"
              checked={generalForm.hasInGameTimer}
              onChange={(e) => setGeneralForm({ ...generalForm, hasInGameTimer: e.target.checked })}
              disabled={!canManage}
            />
            <span className="text-sm text-gray-300">Game has an in-game timer</span>
          </label>

          <div>
            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Cover Image</label>
            <div className="flex items-center gap-4">
              {game.coverImageUrl && (
                <img src={`/api/${game.coverImageUrl}`} alt="Cover" className="w-24 h-24 rounded-lg object-cover border border-slate-700" />
              )}
              {canManage && (
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUploadCover(e.target.files[0]);
                  }}
                />
              )}
            </div>
          </div>

          {canManage && (
            <Button onClick={handleSaveGeneral} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      )}

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <p className="text-sm text-gray-400">
            Levels are used for per-level categories. Add levels here if your game has individual level runs.
          </p>
          {canManage && (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Level name"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLevel()}
              />
              <Button onClick={handleCreateLevel}><Plus size={16} /> Add Level</Button>
            </div>
          )}
          <div className="space-y-2">
            {game.levels.map((level) => (
              <div key={level.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-gray-600" />
                  <span className="text-white">{level.name}</span>
                  <span className="text-xs text-gray-600">#{level.position + 1}</span>
                </div>
                {canManage && (
                  <Button size="sm" variant="danger" onClick={() => handleDeleteLevel(level.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
            {game.levels.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No levels defined.</p>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {canManage && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-bold">Add Category</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                    placeholder="Any%"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as 'FULL_GAME' | 'PER_LEVEL' })}
                  >
                    <option value="FULL_GAME">Full Game</option>
                    <option value="PER_LEVEL">Per Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Player Requirement</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                    value={newCategory.playerType}
                    onChange={(e) => setNewCategory({ ...newCategory, playerType: e.target.value })}
                  >
                    <option value="exactly">Exactly</option>
                    <option value="up_to">Up to</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Player Count</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                    value={newCategory.playerCount}
                    onChange={(e) => setNewCategory({ ...newCategory, playerCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Rules (optional)</label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                  rows={2}
                  placeholder="Category rules..."
                  value={newCategory.rules}
                  onChange={(e) => setNewCategory({ ...newCategory, rules: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateCategory}><Plus size={16} /> Add Category</Button>
            </div>
          )}

          <div className="space-y-3">
            {game.categories.map((cat) => (
              <div key={cat.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                {editingCategory === cat.id ? (
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                        value={editCategoryForm.name}
                        onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                      />
                      <select
                        className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                        value={editCategoryForm.type}
                        onChange={(e) => setEditCategoryForm({ ...editCategoryForm, type: e.target.value })}
                      >
                        <option value="FULL_GAME">Full Game</option>
                        <option value="PER_LEVEL">Per Level</option>
                      </select>
                      <select
                        className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                        value={editCategoryForm.playerType}
                        onChange={(e) => setEditCategoryForm({ ...editCategoryForm, playerType: e.target.value })}
                      >
                        <option value="exactly">Exactly</option>
                        <option value="up_to">Up to</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                        value={editCategoryForm.playerCount}
                        onChange={(e) => setEditCategoryForm({ ...editCategoryForm, playerCount: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <textarea
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
                      rows={2}
                      placeholder="Rules..."
                      value={editCategoryForm.rules}
                      onChange={(e) => setEditCategoryForm({ ...editCategoryForm, rules: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateCategory(cat.id)}><Save size={14} /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white">{cat.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {cat.type === 'FULL_GAME' ? 'Full Game' : 'Per Level'} &middot; {cat.playerType === 'exactly' ? 'Exactly' : 'Up to'} {cat.playerCount} player{cat.playerCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingCategory(cat.id);
                            setEditCategoryForm({
                              name: cat.name,
                              type: cat.type,
                              playerType: cat.playerType,
                              playerCount: cat.playerCount,
                              rules: cat.rules || '',
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {game.categories.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4 bg-slate-900 rounded-xl border border-slate-800">No categories yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Variables Tab */}
      {activeTab === 'variables' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            <strong>Subcategory variables</strong> split the leaderboard into separate tabs (e.g. Platform: N64/Emulator).{' '}
            <strong>Regular variables</strong> are additional details attached to runs (e.g. Version, Route).
          </p>

          {canManage && (
            <>
              {!showNewVariable ? (
                <Button onClick={() => setShowNewVariable(true)}><Plus size={16} /> Add Variable</Button>
              ) : (
                <VariableForm
                  form={newVariable}
                  setForm={setNewVariable}
                  categories={game.categories}
                  onSave={handleCreateVariable}
                  onCancel={() => setShowNewVariable(false)}
                />
              )}
            </>
          )}

          <div className="space-y-3">
            {game.variables.map((v) => (
              <div key={v.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                {editingVariable === v.id ? (
                  <VariableForm
                    form={editVariableForm}
                    setForm={setEditVariableForm}
                    categories={game.categories}
                    onSave={() => handleUpdateVariable(v.id)}
                    onCancel={() => setEditingVariable(null)}
                    isEdit
                  />
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{v.name}</span>
                        {v.isSubcategory && (
                          <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">Subcategory</span>
                        )}
                        {v.isMandatory && (
                          <span className="text-[10px] bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold uppercase">Required</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Scope: {v.scope.replace('_', ' ')}
                        {v.categoryId ? ` \u00b7 Category: ${game.categories.find((c) => c.id === v.categoryId)?.name}` : ' \u00b7 All categories'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.values.map((val) => (
                          <span
                            key={val.id}
                            className={`text-xs px-2 py-1 rounded ${
                              val.isDefault ? 'bg-slate-700 text-white' : 'bg-slate-800 text-gray-400'
                            }`}
                          >
                            {val.label} {val.isDefault && '(default)'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingVariable(v.id);
                            setEditVariableForm({
                              name: v.name,
                              isSubcategory: v.isSubcategory,
                              isMandatory: v.isMandatory,
                              scope: v.scope,
                              categoryId: v.categoryId,
                              values: v.values.map((val) => ({ label: val.label, isDefault: val.isDefault })),
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteVariable(v.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {game.variables.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4 bg-slate-900 rounded-xl border border-slate-800">No variables yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Variable Form Component ──
function VariableForm({
  form,
  setForm,
  categories,
  onSave,
  onCancel,
  isEdit = false,
}: {
  form: {
    name: string;
    isSubcategory: boolean;
    isMandatory: boolean;
    scope: string;
    categoryId: number | null;
    values: { label: string; isDefault: boolean }[];
  };
  setForm: (f: any) => void;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const addValue = () => {
    setForm({ ...form, values: [...form.values, { label: '', isDefault: false }] });
  };

  const removeValue = (index: number) => {
    const newValues = form.values.filter((_: any, i: number) => i !== index);
    setForm({ ...form, values: newValues });
  };

  const updateValue = (index: number, field: string, val: any) => {
    const newValues = [...form.values];
    if (field === 'isDefault' && val === true) {
      // Only one default
      newValues.forEach((v, i) => (newValues[i] = { ...v, isDefault: i === index }));
    } else {
      newValues[index] = { ...newValues[index], [field]: val };
    }
    setForm({ ...form, values: newValues });
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
      <h3 className="font-bold">{isEdit ? 'Edit Variable' : 'Add Variable'}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
            placeholder="Platform"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Scope</label>
          <select
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
          >
            <option value="GLOBAL">Global (all categories)</option>
            <option value="FULL_GAME">Full Game only</option>
            <option value="PER_LEVEL">Per Level only</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Applies to Category</label>
          <select
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors"
            value={form.categoryId ?? ''}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-red-600"
                checked={form.isSubcategory}
                onChange={(e) => setForm({ ...form, isSubcategory: e.target.checked })}
              />
              <span className="text-sm text-gray-300">Subcategory</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-red-600"
                checked={form.isMandatory}
                onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
              />
              <span className="text-sm text-gray-300">Required</span>
            </label>
          </div>
          <p className="text-[11px] text-gray-600">
            <strong className="text-gray-500">Subcategory</strong> splits the leaderboard — runners only compete within the same value (e.g. N64 vs N64). Without it, the variable is just extra info shown on runs.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase text-gray-500 font-bold mb-2">Values</label>
        <div className="space-y-2">
          {form.values.map((v: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-red-500 transition-colors text-sm"
                placeholder="Value label"
                value={v.label}
                onChange={(e) => updateValue(i, 'label', e.target.value)}
              />
              <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400 whitespace-nowrap">
                <input
                  type="radio"
                  name="defaultValue"
                  className="accent-red-600"
                  checked={v.isDefault}
                  onChange={() => updateValue(i, 'isDefault', true)}
                />
                Default
              </label>
              {form.values.length > 1 && (
                <button onClick={() => removeValue(i)} className="text-red-500 hover:text-red-400 p-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addValue} className="text-sm text-red-400 hover:text-red-300 mt-2">
          + Add value
        </button>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave}>{isEdit ? <><Save size={14} /> Save</> : <><Plus size={14} /> Create</>}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
