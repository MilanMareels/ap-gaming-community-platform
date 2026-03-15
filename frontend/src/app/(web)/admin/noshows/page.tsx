'use client';

import { useState, useEffect } from 'react';
import { AlertOctagon, Check, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';
import type { ReservationWithUser } from '@/api';
import { Button } from '@/components/ui/Button';

/** Extract date (YYYY-MM-DD) from an ISO datetime string */
function dateFromISO(iso: string): string {
  return iso.slice(0, 10);
}

/** Format an ISO datetime string to HH:mm */
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
    fetchNoShows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Group no-shows by student (sNumber or email as key)
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
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <h3 className="font-bold text-xl flex items-center gap-2">
          <AlertOctagon className="text-red-500" /> No-Show Logboek
        </h3>
        <p className="text-gray-400 text-sm mt-1">Lijst van studenten die niet zijn komen opdagen.</p>
        <div className="mt-4">
          <input
            type="text"
            placeholder="Zoek op Email of S-nummer"
            className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-gray-500 uppercase">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Aantal No-Shows</th>
              <th className="p-4">Geschiedenis</th>
              <th className="p-4 text-right">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {grouped.map((s) => (
              <tr key={s.sNumber}>
                <td className="p-4 font-bold">
                  {s.name}
                  <div className="text-xs text-gray-500 font-normal">
                    {s.email}
                    {s.sNumber !== '-' && <span className="ml-2 text-gray-600">({s.sNumber})</span>}
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="danger">{s.count}x</Badge>
                </td>
                <td className="p-4 text-gray-400 text-xs">{s.history.join(', ')}</td>
                <td className="p-4 text-right">
                  <Button size="md" variant="secondary" title="Deblokkeren gebruiker" onClick={() => handelUnblockUser(s.id)}>
                    <ShieldOff size="16" />
                  </Button>
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Geen no-shows geregistreerd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
