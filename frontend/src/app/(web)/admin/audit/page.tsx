'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, ChevronDown, ChevronRight, Eye, Globe, History, Loader2, ScrollText, Search, ShieldAlert, X } from 'lucide-react';
import { apiClient } from '@/api';
import type { AuditChange, AuditEvent, AuditFilterOptions } from '@/api';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { useAdmin } from '../AdminShell';
import { ACTION_PHRASES, changeTitle, fieldLabel, formatValue, friendlyError, modelLabel } from './audit-labels';

const PAGE_SIZE = 50;

const DETAIL_LABELS: Record<string, string> = {
  event: 'Gebeurtenis',
  provider: 'Via',
  reason: 'Reden',
  role: 'Rol',
  user: 'Gebruiker',
  form: 'Formulier',
  permissions: 'Permissies',
  permissionsAdded: 'Permissies erbij',
  permissionsRemoved: 'Permissies eraf',
  removedFromUsers: 'Afgenomen van',
  rolesAdded: 'Rollen erbij',
  rolesRemoved: 'Rollen eraf',
  deletedUser: 'Verwijderde gebruiker',
  reservationsDeleted: 'Reservaties mee verwijderd',
  roles: 'Rollen',
  impersonatedUser: 'Impersoneert gebruiker',
  impersonatedRole: 'Impersoneert rol',
};

const inputClass =
  'w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

type Filters = {
  search: string;
  action: string;
  model: string;
  entityId: string;
  actorId: string;
  actorType: '' | 'USER' | 'ANONYMOUS' | 'SYSTEM';
  success: '' | 'true' | 'false';
  from: string;
  to: string;
};

const FILTER_KEYS: (keyof Filters)[] = ['search', 'action', 'model', 'entityId', 'actorId', 'actorType', 'success', 'from', 'to'];

function filtersFromUrl(params: URLSearchParams): Filters {
  const get = (key: string) => params.get(key) ?? '';
  return {
    search: get('search'),
    action: get('action'),
    model: get('model'),
    entityId: get('entityId'),
    actorId: get('actorId'),
    actorType: get('actorType') as Filters['actorType'],
    success: get('success') as Filters['success'],
    from: get('from'),
    to: get('to'),
  };
}

/** A yyyy-mm-dd date picked in the browser, as the moment that day starts (or the next day starts) here. */
function startOfLocalDay(date: string, addDays = 0) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d + addDays).toISOString();
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function actionPhrase(event: Pick<AuditEvent, 'action' | 'description'>) {
  return ACTION_PHRASES[event.action] ?? event.description ?? event.action;
}

function actorLabel(event: AuditEvent) {
  if (event.actorType === 'SYSTEM') return 'Systeem';
  if (event.actorType === 'ANONYMOUS') return 'Iemand zonder login';
  return event.actorName || event.actorEmail || `Gebruiker #${event.actorId}`;
}

function realActorLabel(event: AuditEvent) {
  return event.realActorName || event.realActorEmail || `#${event.realActorId}`;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayHeading(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const long = date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
  if (dayKey(iso) === dayKey(today.toISOString())) return `Vandaag · ${long}`;
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return `Gisteren · ${long}`;
  return capitalize(long);
}

const AVATAR_COLORS = [
  'bg-sky-500/20 text-sky-300',
  'bg-violet-500/20 text-violet-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300',
  'bg-teal-500/20 text-teal-300',
];

function Avatar({ event }: { event: AuditEvent }) {
  if (event.actorType === 'SYSTEM') {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-800 text-gray-400 flex items-center justify-center" title="Automatische taak">
        <Bot size={16} />
      </div>
    );
  }
  if (event.actorType === 'ANONYMOUS') {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-800 text-gray-400 flex items-center justify-center" title="Niet ingelogd">
        <Globe size={16} />
      </div>
    );
  }
  const name = actorLabel(event);
  const initials = name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const color = AVATAR_COLORS[(event.actorId ?? 0) % AVATAR_COLORS.length];
  return <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${color}`}>{initials}</div>;
}

/** The changed values of an update, e.g. "status Gereserveerd → Aanwezig". */
function FieldDiff({ change, limit }: { change: AuditChange; limit: number }) {
  const fields = change.changedFields.slice(0, limit);
  return (
    <>
      {fields.map((field) => (
        <span key={field} className="inline-flex items-center gap-1">
          <span className="text-gray-500">{fieldLabel(field)}</span>
          {change.before && <span className="text-gray-400 line-through decoration-gray-600">{formatValue(change.before[field])}</span>}
          {change.before && <span className="text-gray-600">→</span>}
          <span className="text-gray-200">{formatValue(change.after?.[field])}</span>
        </span>
      ))}
      {change.changedFields.length > limit && <span className="text-gray-500">+{change.changedFields.length - limit} velden</span>}
    </>
  );
}

function ChangeSummary({ change }: { change: AuditChange }) {
  const title = <span className="text-gray-300">{changeTitle(change)}</span>;
  if (change.operation === 'create') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {title}
      </span>
    );
  }
  if (change.operation === 'delete' || change.operation === 'deleteMany') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {title}
        <span className="text-rose-300/80">verwijderd</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        {title}
      </span>
      <FieldDiff change={change} limit={2} />
    </span>
  );
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** The most telling line under an entry: why it failed, what the action itself said, or what changed. */
function EventPreview({ event }: { event: AuditEvent }) {
  if (!event.success) {
    return (
      <span className="inline-flex items-center gap-1.5 text-rose-300">
        <ShieldAlert size={13} /> {friendlyError(event.error, event.statusCode)}
      </span>
    );
  }

  const d = event.details ?? {};
  const added = [...asList(d.permissionsAdded), ...asList(d.rolesAdded)];
  const removed = [...asList(d.permissionsRemoved), ...asList(d.rolesRemoved)];
  if (added.length || removed.length) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {typeof (d.role ?? d.form) === 'string' && <span className="text-gray-300 mr-1">{String(d.role ?? d.form)}</span>}
        {added.map((p) => (
          <span key={`+${p}`} className="rounded bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 font-mono text-[11px]">
            + {p}
          </span>
        ))}
        {removed.map((p) => (
          <span key={`-${p}`} className="rounded bg-rose-500/10 text-rose-300 px-1.5 py-0.5 font-mono text-[11px]">
            − {p}
          </span>
        ))}
      </span>
    );
  }
  if (typeof d.role === 'string' && typeof d.user === 'string') {
    return (
      <span className="text-gray-300">
        {d.role} <span className="text-gray-600">→</span> {d.user}
      </span>
    );
  }
  if (typeof d.impersonatedUser === 'string' || typeof d.impersonatedRole === 'string') {
    return <span className="text-gray-300">{String(d.impersonatedUser ?? `rol ${d.impersonatedRole}`)}</span>;
  }
  if (typeof d.role === 'string' && asList(d.permissions).length) {
    return (
      <span className="text-gray-300">
        {d.role} <span className="text-gray-500">· {asList(d.permissions).join(', ')}</span>
      </span>
    );
  }

  if (event.changes.length === 0) return null;
  const shown = event.changes.slice(0, 2);
  return (
    <span className="flex flex-col gap-0.5">
      {shown.map((change) => (
        <ChangeSummary key={change.id} change={change} />
      ))}
      {event.changes.length > shown.length && <span className="text-gray-500">en nog {event.changes.length - shown.length} wijziging(en)</span>}
    </span>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin text-gray-500" />}>
      <AuditLog />
    </Suspense>
  );
}

function AuditLog() {
  const { hasPermission } = useAdmin();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => filtersFromUrl(new URLSearchParams(searchParams.toString())));
  const [searchInput, setSearchInput] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; events: AuditEvent[]; total: number; error: string } | null>(null);
  const [options, setOptions] = useState<AuditFilterOptions>({ actions: [], models: [] });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const canView = hasPermission('audit.view');

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: filters.search || undefined,
      action: filters.action || undefined,
      model: filters.model || undefined,
      entityId: filters.model && filters.entityId ? filters.entityId : undefined,
      actorId: filters.actorId ? Number(filters.actorId) : undefined,
      actorType: filters.actorType || undefined,
      success: filters.success || undefined,
      from: filters.from ? startOfLocalDay(filters.from) : undefined,
      to: filters.to ? startOfLocalDay(filters.to, 1) : undefined,
    }),
    [filters, page],
  );
  const requestKey = JSON.stringify(query);
  const loading = result?.key !== requestKey;
  const events = useMemo(() => result?.events ?? [], [result]);
  const total = result?.total ?? 0;
  const error = result?.key === requestKey ? result.error : '';

  const days = useMemo(() => {
    const groups: { key: string; heading: string; events: AuditEvent[] }[] = [];
    for (const event of events) {
      const key = dayKey(event.createdAt);
      if (groups.at(-1)?.key !== key) groups.push({ key, heading: dayHeading(event.createdAt), events: [] });
      groups.at(-1)!.events.push(event);
    }
    return groups;
  }, [events]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  // Keep the URL shareable: a link to "the history of reservation 42" is useful to pass on
  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) if (filters[key]) params.set(key, filters[key]);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [filters]);

  // Search as you type, without a request per keystroke
  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => updateFilters({ search: searchInput }), 350);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, updateFilters]);

  useEffect(() => {
    if (!canView) return;
    apiClient.GET('/audit-logs/filters', {}).then((res) => {
      if (res.data) setOptions(res.data);
    });
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    const failed = (previous: typeof result) => ({
      key: requestKey,
      events: previous?.events ?? [],
      total: previous?.total ?? 0,
      error: 'Kon de auditlog niet laden.',
    });
    apiClient
      .GET('/audit-logs', { params: { query } })
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) setResult(failed);
        else setResult({ key: requestKey, events: res.data.items, total: res.data.total, error: '' });
      })
      .catch(() => !cancelled && setResult(failed));
    return () => {
      cancelled = true;
    };
  }, [canView, query, requestKey]);

  const toggle = (id: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const actorFilterLabel = useMemo(() => {
    if (!filters.actorId) return '';
    const match = events.find((e) => String(e.actorId) === filters.actorId || String(e.realActorId) === filters.actorId);
    if (!match) return `gebruiker #${filters.actorId}`;
    return String(match.actorId) === filters.actorId ? actorLabel(match) : realActorLabel(match);
  }, [events, filters.actorId]);

  if (!canView) {
    return <EmptyState icon={ScrollText} title="Geen toegang" description="Je hebt de permissie audit.view nodig om de auditlog te bekijken." />;
  }

  const activeChips: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.actorId) activeChips.push({ label: `Door ${actorFilterLabel}`, clear: { actorId: '' } });
  if (filters.model && filters.entityId) {
    activeChips.push({
      label: `Geschiedenis van ${modelLabel(filters.model).toLowerCase()} #${filters.entityId}`,
      clear: { model: '', entityId: '' },
    });
  }

  const sortedActions = [...options.actions].sort((a, b) => actionPhrase(a).localeCompare(actionPhrase(b), 'nl'));

  return (
    <>
      <PageHeader title="Auditlog" description="Wie wat deed op de site, en wat er precies veranderde. Klik op een regel voor alle details." />

      <div className="bg-slate-900 rounded-xl border border-slate-800 mb-6 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className={labelClass}>Zoeken</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Naam, e-mail of URL..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Actie</label>
            <select className={inputClass} value={filters.action} onChange={(e) => updateFilters({ action: e.target.value })}>
              <option value="">Alle acties</option>
              {sortedActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {capitalize(actionPhrase(a))} ({a.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Soort gegevens</label>
            <select className={inputClass} value={filters.model} onChange={(e) => updateFilters({ model: e.target.value, entityId: '' })}>
              <option value="">Alles</option>
              {[...options.models]
                .sort((a, b) => modelLabel(a).localeCompare(modelLabel(b), 'nl'))
                .map((m) => (
                  <option key={m} value={m}>
                    {modelLabel(m)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Wie</label>
            <select
              className={inputClass}
              value={filters.actorType}
              onChange={(e) => updateFilters({ actorType: e.target.value as Filters['actorType'] })}
            >
              <option value="">Iedereen</option>
              <option value="USER">Ingelogde gebruikers</option>
              <option value="ANONYMOUS">Zonder login (bv. annuleerlink)</option>
              <option value="SYSTEM">Systeem (automatische taken)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Resultaat</label>
            <select className={inputClass} value={filters.success} onChange={(e) => updateFilters({ success: e.target.value as Filters['success'] })}>
              <option value="">Alles</option>
              <option value="true">Gelukt</option>
              <option value="false">Mislukt of geweigerd</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Van</label>
            <input type="date" className={inputClass} value={filters.from} onChange={(e) => updateFilters({ from: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Tot en met</label>
            <input type="date" className={inputClass} value={filters.to} onChange={(e) => updateFilters({ to: e.target.value })} />
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => updateFilters(chip.clear)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20 transition-colors"
              >
                {chip.label} <X size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-500" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          <EmptyState icon={ScrollText} title="Niets gevonden" description="Er zijn geen acties die aan deze filters voldoen." />
        </div>
      ) : (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          {days.map((day) => (
            <section key={day.key}>
              <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">{day.heading}</h2>
              <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800/70 overflow-hidden">
                {day.events.map((event) => (
                  <AuditEventRow
                    key={event.id}
                    event={event}
                    open={expanded.has(event.id)}
                    onToggle={() => toggle(event.id)}
                    onFilter={updateFilters}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        totalItems={total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

function AuditEventRow({
  event,
  open,
  onToggle,
  onFilter,
}: {
  event: AuditEvent;
  open: boolean;
  onToggle: () => void;
  onFilter: (patch: Partial<Filters>) => void;
}) {
  const time = new Date(event.createdAt).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`border-l-2 ${event.success ? 'border-l-transparent' : 'border-l-rose-500/70'}`}>
      <button
        onClick={onToggle}
        className={`w-full text-left px-4 py-3 transition-colors flex gap-3 items-start ${open ? 'bg-slate-800/40' : 'hover:bg-slate-800/30'}`}
      >
        <span className="w-11 shrink-0 pt-1.5 text-xs text-gray-500 tabular-nums">{time}</span>
        <Avatar event={event} />
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-6">
            <span className="font-semibold text-white">{actorLabel(event)}</span> <span className="text-gray-400">{actionPhrase(event)}</span>
            {event.realActorId && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300 align-middle">
                <Eye size={11} /> echt: {realActorLabel(event)}
              </span>
            )}
            {event.impersonatedRole && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300 align-middle">
                <Eye size={11} /> als rol {event.impersonatedRole}
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5">
            <EventPreview event={event} />
          </div>
        </div>
        <span className="pt-1.5 text-gray-600 shrink-0">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>

      {open && <AuditEventDetails event={event} onFilter={onFilter} />}
    </div>
  );
}

function AuditEventDetails({ event, onFilter }: { event: AuditEvent; onFilter: (patch: Partial<Filters>) => void }) {
  const who =
    event.actorType === 'USER' ? [event.actorName, event.actorEmail && `<${event.actorEmail}>`].filter(Boolean).join(' ') : actorLabel(event);
  const facts: [string, string | null | undefined][] = [
    ['Wie', who],
    [
      'Echt gedaan door',
      event.realActorId ? `${realActorLabel(event)}${event.realActorEmail ? ` <${event.realActorEmail}>` : ''}, via impersonatie` : null,
    ],
    ['Geïmpersoneerde rol', event.impersonatedRole],
    ['Tijdstip', new Date(event.createdAt).toLocaleString('nl-BE', { dateStyle: 'full', timeStyle: 'medium' })],
    ['Resultaat', event.success ? 'Gelukt' : friendlyError(event.error, event.statusCode)],
    ['IP-adres', event.ip],
    ['Browser', event.userAgent],
    [
      'Verzoek',
      event.method ? `${event.method} ${event.path} → ${event.statusCode}${event.durationMs != null ? ` (${event.durationMs} ms)` : ''}` : null,
    ],
    ['Technische naam', event.action],
  ];
  const actorId = event.realActorId ?? event.actorId;
  const details = Object.entries(event.details ?? {});
  // For an attempt that failed, what was sent is the interesting part
  const request = (event.request ?? {}) as { params?: Record<string, unknown>; body?: Record<string, unknown> };
  const attempted = event.success ? [] : Object.entries({ ...request.params, ...request.body });
  const hasMain = details.length > 0 || event.changes.length > 0 || attempted.length > 0;

  return (
    <div className={`px-4 pb-5 pt-1 pl-[5.75rem] bg-slate-800/20 grid gap-6 ${hasMain ? 'xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]' : ''}`}>
      {hasMain && (
        <div className="space-y-4 min-w-0">
          {attempted.length > 0 && (
            <section>
              <h4 className={labelClass}>Wat geprobeerd werd</h4>
              <dl className="grid gap-x-4 gap-y-1.5 grid-cols-[150px_1fr] text-sm">
                {attempted.map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-gray-500">{fieldLabel(key)}</dt>
                    <dd className="text-gray-200 break-words">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {details.length > 0 && (
            <section>
              <h4 className={labelClass}>Context</h4>
              <dl className="grid gap-x-4 gap-y-1.5 grid-cols-[150px_1fr] text-sm">
                {details.map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-gray-500">{DETAIL_LABELS[key] ?? key}</dt>
                    <dd className="text-gray-200 break-words">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {event.changes.length > 0 && (
            <section>
              <h4 className={labelClass}>Wat er veranderde</h4>
              <div className="space-y-2">
                {event.changes.map((change) => (
                  <ChangeCard key={change.id} change={change} onFilter={onFilter} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="space-y-4 min-w-0">
        <section>
          <h4 className={labelClass}>Over deze actie</h4>
          <dl className={`grid gap-x-4 gap-y-1.5 text-sm ${hasMain ? 'grid-cols-[120px_1fr]' : 'grid-cols-[150px_1fr] max-w-3xl'}`}>
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-gray-500">{label}</dt>
                  <dd
                    className={`break-words ${label === 'Resultaat' && !event.success ? 'text-rose-300' : 'text-gray-200'} ${label === 'Technische naam' ? 'font-mono text-xs pt-0.5' : ''}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
          {actorId && (
            <button onClick={() => onFilter({ actorId: String(actorId) })} className="mt-3 text-xs text-red-400 hover:text-red-300">
              Alles van {event.realActorId ? realActorLabel(event) : actorLabel(event)} tonen →
            </button>
          )}
        </section>

        {event.request && Object.keys(event.request).length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300">
              Verzonden gegevens
            </summary>
            <pre className="mt-2 text-xs text-gray-300 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto max-h-80">
              {JSON.stringify(event.request, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

const OPERATION_WORDS: Record<string, { label: string; className: string }> = {
  create: { label: 'aangemaakt', className: 'text-emerald-300' },
  update: { label: 'gewijzigd', className: 'text-sky-300' },
  upsert: { label: 'opgeslagen', className: 'text-sky-300' },
  delete: { label: 'verwijderd', className: 'text-rose-300' },
  updateMany: { label: 'in bulk gewijzigd', className: 'text-sky-300' },
  updateManyAndReturn: { label: 'in bulk gewijzigd', className: 'text-sky-300' },
  deleteMany: { label: 'in bulk verwijderd', className: 'text-rose-300' },
  createMany: { label: 'in bulk aangemaakt', className: 'text-emerald-300' },
};

function ChangeCard({ change, onFilter }: { change: AuditChange; onFilter: (patch: Partial<Filters>) => void }) {
  const [showAll, setShowAll] = useState(false);
  const op = OPERATION_WORDS[change.operation] ?? { label: change.operation, className: 'text-gray-300' };
  const before = change.before ?? {};
  const after = change.after ?? {};
  const isUpdate = change.before !== null && change.after !== null;

  const allFields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changed = new Set(change.changedFields);
  const fields = isUpdate && !showAll ? allFields.filter((f) => changed.has(f)) : allFields;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800/70">
        <span className="text-sm font-medium text-white">{changeTitle(change)}</span>
        <span className={`text-xs ${op.className}`}>{op.label}</span>
        {change.entityId && <span className="text-[11px] text-gray-600">#{change.entityId}</span>}
        <div className="ml-auto flex items-center gap-3">
          {isUpdate && allFields.length > change.changedFields.length && (
            <button onClick={() => setShowAll((v) => !v)} className="text-xs text-gray-400 hover:text-white">
              {showAll ? 'Enkel wijzigingen' : 'Alle velden'}
            </button>
          )}
          {change.entityId && (
            <button
              onClick={() => onFilter({ model: change.model, entityId: change.entityId ?? '' })}
              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
            >
              <History size={12} /> Geschiedenis
            </button>
          )}
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-800/50">
          {fields.map((field) => {
            const highlight = isUpdate && changed.has(field);
            return (
              <tr key={field}>
                <td className="px-3 py-1.5 text-gray-500 align-top w-36">{fieldLabel(field)}</td>
                {isUpdate ? (
                  <td className="px-3 py-1.5 align-top break-words">
                    {highlight ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="text-rose-300/80 line-through decoration-rose-500/40">{formatValue(before[field])}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-emerald-300">{formatValue(after[field])}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">{formatValue(after[field])}</span>
                    )}
                  </td>
                ) : (
                  <td className="px-3 py-1.5 align-top break-words text-gray-200">{formatValue(change.after ? after[field] : before[field])}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
