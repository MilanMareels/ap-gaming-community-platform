'use client';

import { useState, useEffect } from 'react';
import { Ban, ShieldOff, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';
import type { ReservationWithUser } from '@/api';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';

function dateFromISO(iso: string): string {
  return iso.slice(0, 10);
}

function formatTime(iso: string): string {
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return d.toISOString().slice(11, 16);
}

interface NoShowGroup {
  id: string;
  sNumber: string;
  email: string;
  name: string;
  count: number;
  history: string[];
}

export default function AdminNoShowsPage() {
  const [noShows, setNoShows] = useState<ReservationWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchNoShows() {
    try {
      const res = await apiClient.GET('/reservations/no-shows', {});
      if (res.data) setNoShows(res.data as ReservationWithUser[]);
    } catch (err) {
      console.error('Failed to fetch no-shows:', err);
    }
  }

  useEffect(() => {
    void fetchNoShows();
  }, []);

  const handelUnblockUser = async (userId: string) => {
    if (!confirm('Ben je zeker dat je deze gebruiker wilt deblokken?')) return;
    try {
      await apiClient.PATCH('/reservations/{userId}/no-show', {
        params: { path: { userId: userId.toString() } },
      });
      await fetchNoShows();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const grouped: NoShowGroup[] = Object.values(
    noShows
      .filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return r.email.toLowerCase().includes(q) || r.user?.sNumber?.toLowerCase().includes(q) || r.user?.name?.toLowerCase().includes(q);
      })
      .reduce(
        (acc, r) => {
          const key = r.user?.sNumber || r.email;
          if (!acc[key]) {
            acc[key] = {
              id: r.userId.toString(),
              sNumber: r.user?.sNumber || '-',
              email: r.email,
              name: r.user?.name || 'Unknown',
              count: 0,
              history: [],
            };
          }
          acc[key].count++;
          acc[key].history.push(`${dateFromISO(r.startTime)} (${formatTime(r.startTime)})`);
          return acc;
        },
        {} as Record<string, NoShowGroup>,
      ),
  ).sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader title="No-Shows" description="Lijst van studenten die niet zijn komen opdagen." />

      <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/50">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Zoek op naam, email of s-nummer..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950 text-gray-500">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Aantal</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Geschiedenis</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {grouped.map((s) => (
                <tr key={s.sNumber} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {s.email}
                      {s.sNumber !== '-' && <span className="text-gray-600 ml-1">({s.sNumber})</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="danger">{s.count}x</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs max-w-xs truncate">{s.history.join(', ')}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handelUnblockUser(s.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Deblokkeren"
                    >
                      <ShieldOff size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState icon={Ban} title="Geen no-shows geregistreerd" description="Er zijn momenteel geen no-shows in het systeem." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
