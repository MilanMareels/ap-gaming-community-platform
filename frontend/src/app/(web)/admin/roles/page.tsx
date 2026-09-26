'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

// Permission categories for the checkbox grid
const PERMISSION_CATEGORIES: Record<string, string[]> = {
  Events: ['events.manage', 'events.registrations.view'],
  Reservaties: ['reservations.manage', 'reservations.noshows.manage'],
  Content: ['roster.manage', 'timetable.manage', 'navigation.manage'],
  Toernooien: ['brackets.manage', 'time-trials.manage', 'point-trials.manage'],
  Beheer: ['users.manage', 'users.roles.manage', 'roles.manage', 'settings.manage'],
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
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
    return <div className="text-gray-400">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Rollen</h2>
        <Button onClick={openCreateForm}>
          <Plus size={18} /> Nieuwe rol
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-900 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Form */}
      {formMode !== 'none' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {formMode === 'create' ? 'Nieuwe rol' : `Rol bewerken: ${editingRole?.name}`}
            </h3>
            <button onClick={closeForm} className="text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Naam</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
                placeholder="bijv. Event Manager"
                disabled={editingRole?.isSystem && formMode === 'edit'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Beschrijving</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
                placeholder="bijv. Kan events en toernooien beheren"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Permissies</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
                <div key={category} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Opslaan...' : formMode === 'create' ? 'Aanmaken' : 'Opslaan'}
            </Button>
            <Button variant="ghost" onClick={closeForm}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {/* Roles list */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Shield size={20} className={role.isSystem ? 'text-red-500' : 'text-blue-400'} />
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
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Users size={14} /> {role.userCount}
                </span>
                <Button variant="ghost" onClick={() => openEditForm(role)} className="p-2">
                  <Pencil size={16} />
                </Button>
                {!role.isSystem && (
                  <Button variant="ghost" onClick={() => handleDelete(role)} className="p-2 text-red-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </Button>
                )}
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
          <div className="text-center text-gray-500 py-8">Geen rollen gevonden</div>
        )}
      </div>
    </div>
  );
}
