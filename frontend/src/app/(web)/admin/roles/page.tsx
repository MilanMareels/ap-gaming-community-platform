'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

interface Permission {
  id: number;
  key: string;
  description: string | null;
}

const PERMISSION_CATEGORIES: Record<string, string[]> = {
  Events: ['events.manage', 'events.registrations.view'],
  Reservaties: ['reservations.manage', 'reservations.noshows.manage'],
  Content: ['roster.manage', 'timetable.manage', 'navigation.manage'],
  Toernooien: ['brackets.manage', 'time-trials.manage', 'point-trials.manage'],
  Beheer: ['users.manage', 'users.roles.manage', 'roles.manage', 'settings.manage'],
};

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.GET('/rbac/roles'),
        apiClient.GET('/rbac/permissions'),
      ]);
      if (rolesRes.data) setRoles(rolesRes.data as Role[]);
      if (permsRes.data) setAllPermissions(permsRes.data as Permission[]);
    } catch {
      setError('Kon rollen niet laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions(new Set());
    setError('');
  };

  const openEditForm = (role: Role) => {
    setFormMode('edit');
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? '');
    setFormPermissions(new Set(role.permissions));
    setError('');
  };

  const closeForm = () => {
    setFormMode('none');
    setEditingRole(null);
    setError('');
  };

  const togglePermission = (key: string) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (keys: string[]) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = keys.every((k) => next.has(k));
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Naam is verplicht');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (formMode === 'create') {
        const { error } = await apiClient.POST('/rbac/roles', {
          body: {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            permissions: [...formPermissions],
          },
        }) as { error?: { message?: string | string[] } };
        if (error) {
          setError(getApiErrorMessage(error));
          return;
        }
      } else if (formMode === 'edit' && editingRole) {
        const { error } = await apiClient.PATCH('/rbac/roles/{id}', {
          params: { path: { id: editingRole.id } },
          body: {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            permissions: [...formPermissions],
          },
        }) as { error?: { message?: string | string[] } };
        if (error) {
          setError(getApiErrorMessage(error));
          return;
        }
      }

      closeForm();
      await fetchData();
    } catch {
      setError('Er ging iets mis');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Weet je zeker dat je de rol "${role.name}" wilt verwijderen?`)) return;

    try {
      const { error } = await apiClient.DELETE('/rbac/roles/{id}', {
        params: { path: { id: role.id } },
      }) as { error?: { message?: string | string[] } };
      if (error) {
        setError(getApiErrorMessage(error));
        return;
      }
      await fetchData();
    } catch {
      setError('Kon rol niet verwijderen');
    }
  };

  const getPermissionLabel = (key: string) => {
    const perm = allPermissions.find((p) => p.key === key);
    return perm?.description ?? key;
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Rollen" description="Beheer rollen en permissies." />
        <div className="text-gray-400 text-center py-12">Laden...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Rollen"
        description="Beheer rollen en permissies."
        actions={
          <Button size="sm" variant="primary" onClick={openCreateForm}>
            <Plus size={16} /> Nieuwe rol
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Form */}
      {formMode !== 'none' && (
        <div className="mb-6 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/50">
            <h3 className="text-sm font-bold text-white">
              {formMode === 'create' ? 'Nieuwe rol' : `Rol bewerken: ${editingRole?.name}`}
            </h3>
            <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Naam</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                  placeholder="bijv. Event Manager"
                  disabled={editingRole?.isSystem && formMode === 'edit'}
                />
              </div>
              <div>
                <label className={labelClass}>Beschrijving</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={inputClass}
                  placeholder="bijv. Kan events en toernooien beheren"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Permissies</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
                  <div key={category} className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={keys.every((k) => formPermissions.has(k))}
                        onChange={() => toggleCategory(keys)}
                        className="rounded accent-red-600"
                      />
                      {category}
                    </label>
                    <div className="space-y-1 ml-5">
                      {keys.map((key) => (
                        <label key={key} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formPermissions.has(key)}
                            onChange={() => togglePermission(key)}
                            className="rounded accent-red-600"
                          />
                          {getPermissionLabel(key)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Opslaan...' : formMode === 'create' ? 'Aanmaken' : 'Opslaan'}
              </Button>
              <Button size="sm" variant="secondary" onClick={closeForm}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Roles list */}
      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-linear-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  role.isSystem
                    ? 'bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20'
                    : 'bg-linear-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20'
                }`}>
                  <Shield size={18} className={role.isSystem ? 'text-red-400' : 'text-blue-400'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{role.name}</span>
                    {role.isSystem && <Badge variant="warning">Systeem</Badge>}
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-400 mt-0.5">{role.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={14} /> {role.userCount}
                </span>
                <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditForm(role)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.permissions.map((perm) => (
                <Badge key={perm} variant="default">
                  {perm}
                </Badge>
              ))}
              {role.permissions.length === 0 && (
                <span className="text-xs text-gray-600">Geen permissies</span>
              )}
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800">
            <EmptyState icon={Shield} title="Geen rollen gevonden" description="Maak een nieuwe rol aan." />
          </div>
        )}
      </div>
    </>
  );
}
