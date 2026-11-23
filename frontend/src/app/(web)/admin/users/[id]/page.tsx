'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Unlink,
  Pencil,
  Loader2,
  Shield,
  BarChart3,
  Eye,
  ScrollText,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { getApiErrorMessage } from '@/util/api-error';
import type { UserNote } from '@/api';
import { describeExpiry } from '@/components/notes/note-types';
import { useAdmin } from '../../AdminShell';
import { UserNotesPanel } from './UserNotesPanel';

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
  notes: UserNote[];
  activeBlock: UserNote | null;
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

const inputClass =
  'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);
  const { user: currentUser, hasPermission } = useAdmin();

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', sNumber: '' });
  const [busy, setBusy] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleListItem[]>([]);
  const [userRoleIds, setUserRoleIds] = useState<Set<number>>(new Set());
  const [togglingRole, setTogglingRole] = useState<number | null>(null);

  const canManageUsers = hasPermission('users.manage');
  const canManageRoles = hasPermission('users.roles.manage');
  const canEditOtherNotes = hasPermission('users.notes.delete_others');
  const canBlock = hasPermission('users.block');
  const canViewStats = hasPermission('statistics.view');
  const canViewAudit = hasPermission('audit.view');
  const isRealAdmin = (currentUser.roles ?? []).includes('Admin') && !currentUser.impersonation;
  const isSelf = detail?.id === currentUser.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, roles, assignedRoles] = await Promise.all([
        api<UserDetail>(`/users/${userId}`),
        canManageRoles ? api<RoleListItem[]>('/rbac/roles').catch(() => [] as RoleListItem[]) : Promise.resolve([] as RoleListItem[]),
        canManageRoles
          ? api<{ id: number; name: string }[]>(`/rbac/users/${userId}/roles`).catch(() => [] as { id: number; name: string }[])
          : Promise.resolve([] as { id: number; name: string }[]),
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
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
          setBusy(false);
        }
      },
    [load],
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setTogglingRole(null);
    }
  };

  const handleImpersonateUser = async () => {
    if (!confirm(`Wil je de site bekijken als ${detail?.name || 'deze gebruiker'}?`)) return;
    try {
      await api(`/auth/impersonate/user/${userId}`, { method: 'POST' });
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to impersonate');
    }
  };

  const liftBlock = async () => {
    if (!detail?.activeBlock || !confirm(`De blokkade van ${detail.name || detail.email} nu opheffen?`)) return;
    await action(() => api(`/users/${userId}/notes/${detail.activeBlock!.id}`, { method: 'PATCH', body: JSON.stringify({ end: true }) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!detail) {
    return (
      <>
        <PageHeader title="Gebruiker niet gevonden" />
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <Button variant="secondary" onClick={() => router.push('/admin/users')}>
          <ArrowLeft size={14} /> Terug naar gebruikers
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Terug naar gebruikers
        </Link>
      </div>

      <PageHeader
        title={detail.name || '(geen naam)'}
        description={`${detail.email} · ${detail.sNumber}`}
        actions={
          <>
            {isRealAdmin && !isSelf && (
              <Button variant="secondary" size="sm" onClick={handleImpersonateUser}>
                <Eye size={14} /> Impersoneer
              </Button>
            )}
            {canViewAudit && (
              <Link href={`/admin/audit?actorId=${userId}`}>
                <Button variant="secondary" size="sm">
                  <ScrollText size={14} /> Auditlog
                </Button>
              </Link>
            )}
            {canViewStats && (
              <Link href={`/admin/statistics/user/${userId}`}>
                <Button variant="secondary" size="sm">
                  <BarChart3 size={14} /> Statistieken
                </Button>
              </Link>
            )}
          </>
        }
      />

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {detail.activeBlock && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <Ban size={20} className="text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-red-100">Geblokkeerd: kan niet inloggen op de site of de app</p>
            <p className="text-sm text-red-200/80">{describeExpiry(detail.activeBlock.expiresAt)}</p>
            <p className="mt-1 truncate text-sm text-red-200/60" title={detail.activeBlock.content}>
              {detail.activeBlock.content}
            </p>
          </div>
          {canBlock && (
            <Button size="sm" variant="secondary" onClick={liftBlock} disabled={busy}>
              Blokkade opheffen
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            {!editing ? (
              <div>
                <div className={sectionTitle}>Profiel</div>
                <div className="text-xl font-bold text-white">{detail.name || <span className="text-gray-500">(geen naam)</span>}</div>
                <div className="text-sm text-gray-400 mt-1">{detail.email}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">s-nummer: {detail.sNumber}</div>
                {canManageUsers && (
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)} className="mt-3">
                    <Pencil size={14} /> Bewerken
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className={sectionTitle}>Profiel bewerken</div>
                <div>
                  <label className={labelClass}>Naam</label>
                  <input type="text" placeholder="Naam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>S-nummer</label>
                  <input type="text" placeholder="S-nummer" value={form.sNumber} onChange={(e) => setForm({ ...form, sNumber: e.target.value })} className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={saveEdit} disabled={busy}>Opslaan</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Annuleer</Button>
                </div>
              </div>
            )}
          </div>

          {/* Roles */}
          {canManageRoles && allRoles.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className={sectionTitle}>Rollen</div>
              <div className="space-y-2">
                {allRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={userRoleIds.has(role.id)}
                        onChange={() => toggleRole(role.id)}
                        disabled={togglingRole !== null}
                        className="rounded accent-red-600"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Shield size={14} className={role.isSystem ? 'text-red-500' : 'text-blue-400'} />
                          <span className="text-sm font-medium text-white">{role.name}</span>
                          {role.isSystem && <Badge variant="warning">Systeem</Badge>}
                        </div>
                        {role.description && <div className="text-xs text-gray-500 mt-0.5">{role.description}</div>}
                      </div>
                    </label>
                    <div className="flex items-center gap-2">
                      {togglingRole === role.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                      {isRealAdmin && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Wil je de site bekijken als de rol "${role.name}"?`)) return;
                            try {
                              await api(`/auth/impersonate/role/${role.id}`, { method: 'POST' });
                              window.location.href = '/admin';
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to impersonate role');
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title={`Impersoneer rol "${role.name}"`}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SSO */}
          {canManageUsers && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className={sectionTitle}>SSO koppelingen</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div>
                    <div className="font-medium text-white">Microsoft</div>
                    <div className="text-xs text-gray-500">{detail.microsoftLinks.length > 0 ? `${detail.microsoftLinks.length} koppeling(en)` : 'Niet gekoppeld'}</div>
                  </div>
                  {detail.microsoftLinks.length > 0 && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => action(() => api(`/users/${userId}/sso/microsoft`, { method: 'DELETE' }), 'Microsoft-koppeling verwijderen?')}>
                      <Unlink size={14} />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div>
                    <div className="font-medium text-white">Google</div>
                    <div className="text-xs text-gray-500">{detail.googleLinks.length > 0 ? `${detail.googleLinks.length} koppeling(en)` : 'Niet gekoppeld'}</div>
                  </div>
                  {detail.googleLinks.length > 0 && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => action(() => api(`/users/${userId}/sso/google`, { method: 'DELETE' }), 'Google-koppeling verwijderen?')}>
                      <Unlink size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reservations */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className={sectionTitle}>Reservaties</div>
            <div className="text-sm text-gray-300 mb-3">
              {detail.reservationCount} totaal · {detail.noShowCount} no-show
            </div>
            {detail.recentReservations.length > 0 && (
              <ul className="space-y-1 text-xs">
                {detail.recentReservations.map((r) => (
                  <li key={r.id} className="flex justify-between text-gray-400 py-1.5 px-2 rounded hover:bg-slate-950 transition-colors">
                    <span>{new Date(r.startTime).toLocaleString('nl-NL')}</span>
                    <span className="font-mono">{r.inventory} · {r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Danger zone */}
          {canManageUsers && (
            <div className="bg-slate-900 border border-red-900/30 rounded-xl p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-2">Gevaarlijke zone</div>
              <Button
                size="sm"
                variant="danger"
                disabled={busy || isSelf}
                onClick={() =>
                  action(
                    () => api(`/users/${userId}`, { method: 'DELETE' }),
                    `Definitief verwijderen? Dit verwijdert de gebruiker en alle ${detail.reservationCount} reservaties.`,
                  ).then(() => router.push('/admin/users'))
                }
              >
                <Trash2 size={14} /> Verwijder gebruiker
              </Button>
              {isSelf && <p className="text-xs text-gray-500 mt-2">Je kan je eigen account niet verwijderen.</p>}
            </div>
          )}
        </div>

        {/* Right column: Notes */}
        <div className="space-y-6">
          <UserNotesPanel
            user={detail}
            notes={detail.notes}
            currentUserId={currentUser.id}
            isSelf={isSelf}
            canEditOthers={canEditOtherNotes}
            canBlock={canBlock}
            onChanged={load}
            onError={setError}
          />
        </div>
      </div>
    </>
  );
}
