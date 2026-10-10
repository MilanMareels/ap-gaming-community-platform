'use client';

import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/api';
import type { ReservationStatistics } from '@/api';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  slate: '#64748b',
};

const PIE_COLORS = [COLORS.green, COLORS.red, COLORS.amber, COLORS.blue, COLORS.purple];

const STATUS_LABELS: Record<string, string> = {
  RESERVED: 'Geboekt',
  PRESENT: 'Aanwezig',
  NO_SHOW: 'Afwezig',
  CANCELLED: 'Geannuleerd',
};

const STATUS_COLORS: Record<string, string> = {
  RESERVED: COLORS.blue,
  PRESENT: COLORS.green,
  NO_SHOW: COLORS.red,
  CANCELLED: COLORS.amber,
};

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 p-5 ${className}`}>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

const HEATMAP_DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function HeatmapCell({ count, max }: { count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0;
  const bg =
    intensity === 0
      ? 'bg-slate-800'
      : intensity < 0.25
        ? 'bg-red-950'
        : intensity < 0.5
          ? 'bg-red-900'
          : intensity < 0.75
            ? 'bg-red-700'
            : 'bg-red-500';
  return (
    <div className={`${bg} rounded text-center text-xs font-semibold text-white py-1.5 min-w-10`} title={`${count} reserveringen`}>
      {count || ''}
    </div>
  );
}

type RangePreset = 'all' | '7d' | '30d' | '90d' | 'custom';

function rangeFromPreset(preset: RangePreset): { from?: string; to?: string } {
  if (preset === 'all') return {};
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const daysBack = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - daysBack);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
  return { from, to };
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<ReservationStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const range = preset === 'custom' ? { from: customFrom || undefined, to: customTo || undefined } : rangeFromPreset(preset);
        const res = await apiClient.GET('/reservations/statistics', { params: { query: range } });
        if (res.data) setStats(res.data);
      } catch (err) {
        console.error('Failed to load statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [preset, customFrom, customTo]);

  const presetButtons: { value: RangePreset; label: string }[] = [
    { value: 'all', label: 'Alles' },
    { value: '7d', label: '7 dagen' },
    { value: '30d', label: '30 dagen' },
    { value: '90d', label: '90 dagen' },
    { value: 'custom', label: 'Aangepast' },
  ];

  const dateInputClass = 'bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-colors';

  const renderRangeSelector = () => (
    <div className="rounded-xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {presetButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setPreset(btn.value)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                preset === btn.value
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-950 text-gray-400 hover:bg-slate-800 hover:text-white border border-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Van</label>
              <input
                type="date"
                className={dateInputClass}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tot</label>
              <input
                type="date"
                className={dateInputClass}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Statistieken" description="Reserveringsstatistieken en trends." />
        <div className="space-y-6">
          {renderRangeSelector()}
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <PageHeader title="Statistieken" description="Reserveringsstatistieken en trends." />
        <div className="space-y-6">
          {renderRangeSelector()}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-gray-500">Kon statistieken niet laden.</div>
        </div>
      </>
    );
  }

  const totalReservations = stats.dailyCounts.reduce((s, d) => s + d.count, 0);
  const presentCount = stats.statusBreakdown.find((s) => s.status === 'PRESENT')?.count ?? 0;
  const noShowCount = stats.statusBreakdown.find((s) => s.status === 'NO_SHOW')?.count ?? 0;
  const showRate = totalReservations > 0 ? Math.round((presentCount / totalReservations) * 1000) / 10 : 0;
  const noShowRate = totalReservations > 0 ? Math.round((noShowCount / totalReservations) * 1000) / 10 : 0;

  const heatmapData = new Map<string, number>();
  let heatmapMax = 0;
  for (const h of stats.peakHoursHeatmap) {
    const key = `${h.day}|${h.hour}`;
    heatmapData.set(key, h.count);
    if (h.count > heatmapMax) heatmapMax = h.count;
  }
  const heatmapHours = [...new Set(stats.peakHoursHeatmap.map((h) => h.hour))].sort((a, b) => a - b);

  const pieData = stats.statusBreakdown.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? COLORS.slate,
  }));

  const recentDaily = stats.dailyCounts.slice(-30);
  const recentHwOverTime = stats.hardwareOverTime.slice(-12);
  const recentStatusOverTime = stats.statusOverTime.slice(-12);
  const recentNewVsReturning = stats.newVsReturning.slice(-12);

  return (
    <>
      <PageHeader title="Statistieken" description="Reserveringsstatistieken en trends." />

      <div className="space-y-6">
        {renderRangeSelector()}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard title="Totaal reserveringen" value={totalReservations} />
          <StatCard title="Unieke gebruikers" value={stats.repeatUsers.totalUsers} />
          <StatCard title="Terugkerende gebruikers" value={`${stats.repeatUsers.repeatPercent}%`} subtitle={`${stats.repeatUsers.repeatUsers} van ${stats.repeatUsers.totalUsers}`} />
          <StatCard title="Opkomstpercentage" value={`${showRate}%`} subtitle={`${presentCount} aanwezig`} />
          <StatCard title="No-show percentage" value={`${noShowRate}%`} subtitle={`${noShowCount} afwezig`} />
        </div>

        {/* Row 1: Reservations trend + Status pie */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Reserveringen per dag (laatste 30 dagen)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={recentDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Area type="monotone" dataKey="count" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.15} name="Reserveringen" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Statusverdeling">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="42%"
                  innerRadius={50}
                  outerRadius="65%"
                  dataKey="value"
                  paddingAngle={3}
                  label={(props) => {
                    const cx = Number(props.cx);
                    const cy = Number(props.cy);
                    const innerRadius = Number(props.innerRadius);
                    const outerRadius = Number(props.outerRadius);
                    const midAngle = Number(props.midAngle);
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
                    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
                    return (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={11} fontWeight={700}>
                        {`${(Number(props.percent) * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ width: '100%', fontSize: 11, lineHeight: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2: Weekday averages + Duration distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Gemiddelde reserveringen per weekdag">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.weekdayAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="avg" fill={COLORS.red} radius={[4, 4, 0, 0]} name="Gemiddelde" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Duur van reserveringen">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.durationDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} name="Aantal" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3: Peak hours heatmap */}
        <ChartCard title="Piekuren heatmap">
          {heatmapHours.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-gray-500 font-semibold" />
                    {heatmapHours.map((h) => (
                      <th key={h} className="p-1 text-center text-gray-400 font-semibold">
                        {String(h).padStart(2, '0')}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HEATMAP_DAYS.map((day) => (
                    <tr key={day}>
                      <td className="p-2 text-gray-400 font-semibold whitespace-nowrap">{day}</td>
                      {heatmapHours.map((h) => (
                        <td key={h} className="p-1">
                          <HeatmapCell count={heatmapData.get(`${day}|${h}`) ?? 0} max={heatmapMax} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>

        {/* Row 4: Hardware breakdown + Hardware over time */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Hardware verdeling">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.hardwareBreakdown.map((h) => ({ name: h.inventory.toUpperCase(), value: h.count }))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {stats.hardwareBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Hardware populariteit per week">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={recentHwOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: string) => v.replace(/^\d{4}-/, '')} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="pc" stroke={COLORS.red} strokeWidth={2} dot={false} name="PC" />
                <Line type="monotone" dataKey="ps5" stroke={COLORS.blue} strokeWidth={2} dot={false} name="PS5" />
                <Line type="monotone" dataKey="switch" stroke={COLORS.green} strokeWidth={2} dot={false} name="Switch" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 5: Utilization + Controller demand */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Bezettingsgraad per hardware type">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.utilization.map((u) => ({ name: u.inventory.toUpperCase(), bezetting: u.utilizationPercent, capaciteit: u.maxCapacity }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} formatter={(value) => `${value}%`} />
                <Bar dataKey="bezetting" fill={COLORS.cyan} radius={[4, 4, 0, 0]} name="Bezetting" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 p-5">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Controller vraag</h3>
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-black text-white">{stats.avgControllersPerReservation}</p>
                <p className="mt-2 text-sm text-gray-400">gemiddeld aantal controllers per reservering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Show/No-show rates over time */}
        <ChartCard title="Opkomst- en no-show percentage per week">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={recentStatusOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: string) => v.replace(/^\d{4}-/, '')} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} formatter={(value) => `${value}%`} />
              <Legend />
              <Area type="monotone" dataKey="showRate" stackId="1" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.3} name="Aanwezig" />
              <Area type="monotone" dataKey="noShowRate" stackId="1" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.3} name="Afwezig" />
              <Area type="monotone" dataKey="cancelRate" stackId="1" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.3} name="Geannuleerd" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 7: New vs Returning users */}
        <ChartCard title="Nieuwe vs. terugkerende gebruikers per week">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recentNewVsReturning}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: string) => v.replace(/^\d{4}-/, '')} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
              <Legend />
              <Bar dataKey="newUsers" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="Nieuw" />
              <Bar dataKey="returningUsers" fill={COLORS.green} radius={[4, 4, 0, 0]} name="Terugkerend" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 8: Capacity pressure table */}
        <ChartCard title="Capaciteitsdruk per tijdslot">
          {stats.capacityPressure.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-500">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Tijdslot</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Max capaciteit</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Gem. boekingen</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Keer vol</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Druk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.capacityPressure.map((cp) => {
                    const pressure = cp.maxCapacity > 0 ? cp.avgBookings / cp.maxCapacity : 0;
                    const barColor = pressure >= 0.9 ? 'bg-red-500' : pressure >= 0.7 ? 'bg-amber-500' : 'bg-green-500';
                    return (
                      <tr key={cp.slot} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{cp.slot}</td>
                        <td className="px-4 py-3 text-gray-300">{cp.maxCapacity}</td>
                        <td className="px-4 py-3 text-gray-300">{cp.avgBookings}</td>
                        <td className="px-4 py-3 text-gray-300">{cp.timesAtCapacity}x</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pressure * 100, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{Math.round(pressure * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>

        {/* Row 9: Top users */}
        <ChartCard title="Meest actieve gebruikers">
          {stats.topUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-500">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Gebruiker</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Reserveringen</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Opkomst</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">No-show</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.topUsers.map((u, i) => (
                    <tr key={u.userId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-semibold">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}{u.sNumber && <span className="ml-2">({u.sNumber})</span>}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{u.totalReservations}</td>
                      <td className="px-4 py-3 text-green-400">{u.showRate}%</td>
                      <td className="px-4 py-3 text-red-400">{u.noShowRate}%</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/statistics/user/${u.userId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
                        >
                          Bekijk <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>
      </div>
    </>
  );
}
