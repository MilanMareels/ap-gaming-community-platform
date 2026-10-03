'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';
import Link from 'next/link';

interface PendingRun {
  id: number;
  timeMs: number;
  inGameTimeMs: number | null;
  videoUrl: string;
  description: string | null;
  runDate: string;
  status: string;
  createdAt: string;
  game: { id: number; name: string; slug: string; hasInGameTimer: boolean };
  category: { id: number; name: string; type: string };
  level: { id: number; name: string } | null;
  submitter: { id: number; name: string | null; email: string };
  players: { id: number; userId: number | null; guestName: string | null; user: { id: number; name: string | null } | null }[];
  variableValues: { variable: { id: number; name: string }; value: { id: number; label: string } }[];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export default function AdminSpeedrunRunsPage() {
  const [runs, setRuns] = useState<PendingRun[]>([]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function fetchPending() {
    const res = await apiClient.GET('/speedruns/runs/pending' as any, {});
    if (res.data) setRuns(res.data as PendingRun[]);
  }

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (id: number) => {
    await apiClient.PATCH('/speedruns/runs/{id}/verify' as any, {
      params: { path: { id: id.toString() } },
    });
    await fetchPending();
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) return;
    await apiClient.PATCH('/speedruns/runs/{id}/reject' as any, {
      params: { path: { id: id.toString() } },
      body: { reason: rejectReason } as any,
    });
    setRejectingId(null);
    setRejectReason('');
    await fetchPending();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/speedruns">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Back</Button>
        </Link>
        <h2 className="text-xl font-bold">Pending Runs</h2>
        <Badge variant="warning">{runs.length}</Badge>
      </div>

      {runs.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8 bg-slate-900 rounded-xl border border-slate-800">
          No pending runs to review.
        </p>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">
                    {run.game.name} &mdash; {run.category.name}
                    {run.level && <span className="text-gray-400"> ({run.level.name})</span>}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Submitted by {run.submitter.name || run.submitter.email} &middot; {new Date(run.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-white">{formatTime(run.timeMs)}</p>
                  {run.inGameTimeMs && (
                    <p className="text-sm text-gray-400 font-mono">IGT: {formatTime(run.inGameTimeMs)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-gray-400">
                  Players: {run.players.map((p) => p.user?.name || p.guestName).join(', ')}
                </span>
                {run.variableValues.map((vv) => (
                  <span key={vv.variable.id} className="bg-slate-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                    {vv.variable.name}: {vv.value.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Run date: {new Date(run.runDate).toLocaleDateString()}</span>
                {run.videoUrl && (
                  <a href={run.videoUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 flex items-center gap-1">
                    <ExternalLink size={14} /> Video
                  </a>
                )}
              </div>

              {rejectingId === run.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-red-500 transition-colors text-sm"
                    placeholder="Rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReject(run.id)}
                    autoFocus
                  />
                  <Button size="sm" variant="danger" onClick={() => handleReject(run.id)}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => handleVerify(run.id)}>
                    <Check size={14} /> Verify
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRejectingId(run.id)}>
                    <X size={14} /> Reject
                  </Button>
                  <Link href={`/speedruns/${run.game.slug}/run/${run.id}`}>
                    <Button size="sm" variant="ghost">
                      <ExternalLink size={14} /> View
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
