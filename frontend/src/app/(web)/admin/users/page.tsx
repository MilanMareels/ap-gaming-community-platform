'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, Trash2, Unlink, Pencil, X, Loader2, Users, Search, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/util/api-error';
import { useAdmin } from '../layout';

type UserListItem = {
  id: number;
  name: string | null;
  email: string;
  sNumber: string;
  isAdmin: boolean;
  googleLinked: boolean;
  microsoftLinked: boolean;
  reservationCount: number;
  noShowCount: number;
  roles: string[];
};

type SsoLink = { id: number; ssoId: string };

type UserDetail = {
  id: number;
  name: string | null;
  email: string;
  sNumber: string;
  isAdmin: boolean;
  googleLinks: SsoLink[];
  microsoftLinks: SsoLink[];
  reservationCount: number;
  noShowCount: number;
  recentReservations: {
    id: number;
    cuid: string;
    inventory: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
};

type RoleListItem = {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, `${res.status} ${res.statusText}`));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAdmin();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [adminOnly, setAdminOnly] = useState(false);
  const [noShowsOnly, setNoShowsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (adminOnly) params.set('adminOnly', 'true');
      if (noShowsOnly) params.set('noShowsOnly', 'true');
      const list = await api<UserListItem[]>(`/users?${params.toString()}`);
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, adminOnly, noShowsOnly]);

  useEffect(() => {
    const handle = setTimeout(refresh, 200);
    return () => clearTimeout(handle);
  }, [refresh]);

  return (
    <div className='space-y-6'>
      <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden'>
        <div className='p-6 border-b border-slate-800'>
          <h3 className='font-bold text-xl flex items-center gap-2'>
            <Users className='text-red-500' /> Gebruikers
          </h3>
          <p className='text-gray-400 text-sm mt-1'>Beheer accounts, admin-rechten en SSO-koppelingen.</p>

          <div className='mt-4 flex flex-wrap gap-3 items-center'>
            <div className='relative flex-1 min-w-[200px]'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500' />
              <input
                type='text'
                placeholder='Zoek op naam, email of s-nummer'
                className='bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-white text-sm w-full'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className='flex items-center gap-2 text-sm text-gray-300'>
              <input type='checkbox' checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
              Enkel admins
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-300'>
              <input type='checkbox' checked={noShowsOnly} onChange={(e) => setNoShowsOnly(e.target.checked)} />
              Met no-shows
            </label>
          </div>
        </div>

        {error && <div className='m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}

        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-slate-950 text-gray-500 uppercase'>
              <tr>
                <th className='p-4'>Naam</th>
                <th className='p-4'>Email</th>
                <th className='p-4'>S-nummer</th>
                <th className='p-4'>SSO</th>
                <th className='p-4'>Rol</th>
                <th className='p-4'>Reservaties</th>
                <th className='p-4 text-right'>Acties</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-800'>
              {loading && (
                <tr>
                  <td colSpan={7} className='p-8 text-center text-gray-500'>
                    <Loader2 className='inline animate-spin' size={18} />
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr key={u.id} className='hover:bg-slate-950/40'>
                    <td className='p-4 font-medium'>{u.name || <span className='text-gray-500'>—</span>}</td>
                    <td className='p-4 text-gray-300'>{u.email}</td>
                    <td className='p-4 text-gray-400 text-xs font-mono'>{u.sNumber}</td>
                    <td className='p-4'>
                      <div className='flex gap-1'>
                        {u.microsoftLinked && <Badge variant='info'>MS</Badge>}
                        {u.googleLinked && <Badge variant='default'>G</Badge>}
                        {!u.microsoftLinked && !u.googleLinked && <span className='text-xs text-gray-600'>—</span>}
                      </div>
                    </td>
                    <td className='p-4'>
                      <div className='flex flex-wrap gap-1'>
                        {u.roles.map((role) => (
                          <Badge key={role} variant={role === 'Admin' ? 'danger' : 'info'}>{role}</Badge>
                        ))}
                        {u.roles.length === 0 && <span className='text-xs text-gray-600'>—</span>}
                      </div>
                    </td>
                    <td className='p-4 text-gray-300'>
                      {u.reservationCount}
                      {u.noShowCount > 0 && <span className='text-red-400 text-xs ml-2'>({u.noShowCount} no-show)</span>}
                    </td>
                    <td className='p-4 text-right'>
                      <Button size='md' variant='secondary' onClick={() => setSelectedId(u.id)}>
                        Beheer
                      </Button>
                    </td>
                  </tr>
                ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className='p-8 text-center text-gray-500'>
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId !== null && (
        <UserDetailDrawer
          userId={selectedId}
          currentUserId={currentUser.id}
          onClose={() => setSelectedId(null)}
          onMutated={refresh}
        />
      )}
    </div>
  );
}

function UserDetailDrawer({
  userId,
  currentUserId,
  onClose,
  onMutated,
}: {
  userId: number;
  currentUserId: number;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', sNumber: '' });
  const [busy, setBusy] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleListItem[]>([]);
  const [userRoleIds, setUserRoleIds] = useState<Set<number>>(new Set());
  const [togglingRole, setTogglingRole] = useState<number | null>(null);

  const isSelf = detail?.id === currentUserId;

  const { hasPermission } = useAdmin();
  const canManageRoles = hasPermission('users.roles.manage');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, roles, assignedRoles] = await Promise.all([
        api<UserDetail>(`/users/${userId}`),
        canManageRoles ? api<RoleListItem[]>('/rbac/roles').catch(() => [] as RoleListItem[]) : Promise.resolve([] as RoleListItem[]),
        canManageRoles ? api<{ id: number; name: string }[]>(`/rbac/users/${userId}/roles`).catch(() => [] as { id: number; name: string }[]) : Promise.resolve([] as { id: number; name: string }[]),
      ]);
      setDetail(data);
      setForm({ name: data.name || '', email: data.email, sNumber: data.sNumber });
      setAllRoles(roles);
      setUserRoleIds(new Set(assignedRoles.map((r) => r.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [userId, canManageRoles]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useMemo(
    () =>
      async (fn: () => Promise<unknown>, confirmMsg?: string) => {
        if (confirmMsg && !confirm(confirmMsg)) return;
        setBusy(true);
        setError('');
        try {
          await fn();
          await load();
          onMutated();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
          setBusy(false);
        }
      },
    [load, onMutated],
  );

  const saveEdit = () =>
    action(async () => {
      await api(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(form) });
      setEditing(false);
    });

  const toggleRole = async (roleId: number) => {
    setTogglingRole(roleId);
    setError('');
    try {
      const hasRole = userRoleIds.has(roleId);
      await api(`/rbac/users/${userId}/roles/${roleId}`, {
        method: hasRole ? 'DELETE' : 'POST',
      });
      setUserRoleIds((prev) => {
        const next = new Set(prev);
        if (hasRole) next.delete(roleId);
        else next.add(roleId);
        return next;
      });
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setTogglingRole(null);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm' onClick={onClose}>
      <div
        className='w-full max-w-md h-full bg-slate-950 border-l border-slate-800 overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='sticky top-0 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 z-10'>
          <h3 className='font-bold text-lg'>Gebruiker</h3>
          <button onClick={onClose} className='text-gray-400 hover:text-white'>
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div className='p-8 text-center text-gray-500'>
            <Loader2 className='animate-spin inline' />
          </div>
        )}

        {error && <div className='m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}

        {detail && (
          <div className='p-4 space-y-6'>
            {!editing ? (
              <section className='space-y-1'>
                <div className='text-xs uppercase text-gray-500'>Profiel</div>
                <div className='text-xl font-bold text-white'>{detail.name || <span className='text-gray-500'>(geen naam)</span>}</div>
                <div className='text-sm text-gray-400'>{detail.email}</div>
                <div className='text-xs text-gray-500 font-mono'>s-nummer: {detail.sNumber}</div>
                <Button size='md' variant='secondary' onClick={() => setEditing(true)} className='mt-3'>
                  <Pencil size={14} /> Bewerken
                </Button>
              </section>
            ) : (
              <section className='space-y-3'>
                <div className='text-xs uppercase text-gray-500'>Profiel bewerken</div>
                <input
                  type='text'
                  placeholder='Naam'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm w-full'
                />
                <input
                  type='email'
                  placeholder='Email'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm w-full'
                />
                <input
                  type='text'
                  placeholder='S-nummer'
                  value={form.sNumber}
                  onChange={(e) => setForm({ ...form, sNumber: e.target.value })}
                  className='bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm w-full'
                />
                <div className='flex gap-2'>
                  <Button size='md' variant='primary' onClick={saveEdit} disabled={busy}>
                    Opslaan
                  </Button>
                  <Button size='md' variant='secondary' onClick={() => setEditing(false)}>
                    Annuleer
                  </Button>
                </div>
              </section>
            )}

            <section>
              <div className='text-xs uppercase text-gray-500 mb-2'>Rol</div>
              {detail.isAdmin ? (
                <div className='flex items-center justify-between'>
                  <Badge variant='danger'>Admin</Badge>
                  <Button
                    size='md'
                    variant='secondary'
                    disabled={busy}
                    onClick={() =>
                      action(
                        () => api(`/users/${userId}/admin`, { method: 'DELETE' }),
                        isSelf ? 'Je staat op het punt jezelf te demoten. Weet je het zeker?' : undefined,
                      )
                    }
                  >
                    <ShieldOff size={14} /> Demote
                  </Button>
                </div>
              ) : (
                <Button
                  size='md'
                  variant='primary'
                  disabled={busy}
                  onClick={() => action(() => api(`/users/${userId}/promote`, { method: 'POST' }))}
                >
                  <ShieldCheck size={14} /> Promote to admin
                </Button>
              )}
            </section>

            {canManageRoles && allRoles.length > 0 && (
              <section>
                <div className='text-xs uppercase text-gray-500 mb-2'>Rollen</div>
                <div className='space-y-2'>
                  {allRoles.map((role) => (
                    <label
                      key={role.id}
                      className='flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3 cursor-pointer hover:border-slate-700 transition-colors'
                    >
                      <div className='flex items-center gap-2.5'>
                        <input
                          type='checkbox'
                          checked={userRoleIds.has(role.id)}
                          onChange={() => toggleRole(role.id)}
                          disabled={togglingRole !== null}
                          className='rounded accent-red-600'
                        />
                        <div>
                          <div className='flex items-center gap-2'>
                            <Shield size={14} className={role.isSystem ? 'text-red-500' : 'text-blue-400'} />
                            <span className='text-sm font-medium text-white'>{role.name}</span>
                            {role.isSystem && <Badge variant='warning'>Systeem</Badge>}
                          </div>
                          {role.description && (
                            <div className='text-xs text-gray-500 mt-0.5'>{role.description}</div>
                          )}
                        </div>
                      </div>
                      {togglingRole === role.id && <Loader2 size={14} className='animate-spin text-gray-400' />}
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className='text-xs uppercase text-gray-500 mb-2'>SSO koppelingen</div>
              <ul className='space-y-2'>
                <li className='flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3'>
                  <div>
                    <div className='font-medium text-white'>Microsoft</div>
                    <div className='text-xs text-gray-500'>{detail.microsoftLinks.length > 0 ? `${detail.microsoftLinks.length} koppeling(en)` : 'Niet gekoppeld'}</div>
                  </div>
                  {detail.microsoftLinks.length > 0 && (
                    <Button
                      size='md'
                      variant='secondary'
                      disabled={busy}
                      onClick={() => action(() => api(`/users/${userId}/sso/microsoft`, { method: 'DELETE' }), 'Microsoft-koppeling verwijderen?')}
                    >
                      <Unlink size={14} />
                    </Button>
                  )}
                </li>
                <li className='flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3'>
                  <div>
                    <div className='font-medium text-white'>Google</div>
                    <div className='text-xs text-gray-500'>{detail.googleLinks.length > 0 ? `${detail.googleLinks.length} koppeling(en)` : 'Niet gekoppeld'}</div>
                  </div>
                  {detail.googleLinks.length > 0 && (
                    <Button
                      size='md'
                      variant='secondary'
                      disabled={busy}
                      onClick={() => action(() => api(`/users/${userId}/sso/google`, { method: 'DELETE' }), 'Google-koppeling verwijderen?')}
                    >
                      <Unlink size={14} />
                    </Button>
                  )}
                </li>
              </ul>
            </section>

            <section>
              <div className='text-xs uppercase text-gray-500 mb-2'>Reservaties</div>
              <div className='text-sm text-gray-300'>
                {detail.reservationCount} totaal · {detail.noShowCount} no-show
              </div>
              {detail.recentReservations.length > 0 && (
                <ul className='mt-3 space-y-1 text-xs'>
                  {detail.recentReservations.map((r) => (
                    <li key={r.id} className='flex justify-between text-gray-400'>
                      <span>{new Date(r.startTime).toLocaleString('nl-NL')}</span>
                      <span className='font-mono'>{r.inventory} · {r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className='border-t border-slate-800 pt-4'>
              <div className='text-xs uppercase text-gray-500 mb-2'>Gevaarlijke zone</div>
              <Button
                size='md'
                variant='danger'
                disabled={busy || isSelf}
                onClick={() =>
                  action(
                    () => api(`/users/${userId}`, { method: 'DELETE' }),
                    `Definitief verwijderen? Dit verwijdert de gebruiker en alle ${detail.reservationCount} reservaties.`,
                  ).then(onClose)
                }
              >
                <Trash2 size={14} /> Verwijder gebruiker
              </Button>
              {isSelf && <p className='text-xs text-gray-500 mt-2'>Je kan je eigen account niet verwijderen.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
