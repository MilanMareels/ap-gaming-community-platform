'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/api';
import type { UserStatistics } from '@/api';
import { Button } from '@/components/ui/Button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const PIE_COLORS = [COLORS.red, COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple];

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-black ${color ?? 'text-white'}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

export default function UserStatisticsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.GET('/reservations/statistics/user/{userId}', {
          params: { path: { userId } },
        });
        if (res.data) setStats(res.data);
      } catch (err) {
        console.error('Failed to load user statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Link href="/admin/statistics">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Terug naar statistieken</Button>
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-gray-500">Kon gebruikersstatistieken niet laden.</div>
      </div>
    );
  }

  const durationLabel = stats.avgDurationMinutes >= 60
    ? `${Math.floor(stats.avgDurationMinutes / 60)}u${stats.avgDurationMinutes % 60 > 0 ? String(stats.avgDurationMinutes % 60).padStart(2, '0') : ''}`
    : `${stats.avgDurationMinutes}min`;

  const favoriteHw = stats.hardwareBreakdown.length > 0
    ? [...stats.hardwareBreakdown].sort((a, b) => b.count - a.count)[0].inventory.toUpperCase()
    : '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/statistics">
            <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Terug</Button>
          </Link>
          <div>
            <h2 className="text-xl font-black text-white">{stats.user.name}</h2>
            <p className="text-sm text-gray-400">
              {stats.user.email}
              {stats.user.sNumber && <span className="ml-2 text-gray-500">({stats.user.sNumber})</span>}
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard title="Totaal reserveringen" value={stats.totalReservations} />
        <StatCard title="Opkomst" value={`${stats.showRate}%`} color="text-green-400" />
        <StatCard title="No-show" value={`${stats.noShowRate}%`} color="text-red-400" />
        <StatCard title="Geannuleerd" value={`${stats.cancelRate}%`} color="text-amber-400" />
        <StatCard title="Gem. duur" value={durationLabel} />
        <StatCard title="Favoriete hardware" value={favoriteHw} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Reserveringen per maand">
          {stats.reservationsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.reservationsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke={COLORS.red} strokeWidth={2} name="Reserveringen" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>

        <ChartCard title="Hardware verdeling">
          {stats.hardwareBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.hardwareBreakdown.map((h) => ({ name: h.inventory.toUpperCase(), value: h.count }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {stats.hardwareBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Voorkeurstijdstippen">
          {stats.preferredSlots.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.preferredSlots.map((s) => ({ slot: `${String(s.hour).padStart(2, '0')}:00`, count: s.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="slot" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="count" fill={COLORS.cyan} radius={[4, 4, 0, 0]} name="Aantal" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">Geen data beschikbaar.</p>
          )}
        </ChartCard>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Gem. controllers per reservering</h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-5xl font-black text-white">{stats.avgControllers}</p>
              <p className="mt-2 text-sm text-gray-400">controllers per reservering</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
