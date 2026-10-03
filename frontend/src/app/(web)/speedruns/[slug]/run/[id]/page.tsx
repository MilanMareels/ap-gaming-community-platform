'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader, Clock, Users, Calendar, Video, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

interface RunDetail {
  id: number;
  timeMs: number;
  inGameTimeMs: number | null;
  videoUrl: string;
  description: string | null;
  runDate: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  game: { id: number; name: string; slug: string; hasInGameTimer: boolean };
  category: { id: number; name: string; type: string };
  level: { id: number; name: string } | null;
  submitter: { id: number; name: string | null; email: string };
  verifier: { id: number; name: string | null } | null;
  players: { id: number; userId: number | null; guestName: string | null; user: { id: number; name: string | null } | null }[];
  variableValues: { variable: { id: number; name: string; isSubcategory: boolean }; value: { id: number; label: string } }[];
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

function getVideoEmbed(url: string): { type: 'youtube' | 'twitch' | 'link'; embedUrl: string } | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  // Twitch
  const twitchMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (twitchMatch) {
    return { type: 'twitch', embedUrl: `https://player.twitch.tv/?video=${twitchMatch[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}` };
  }
  return null;
}

export default function SpeedrunRunPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.GET('/speedruns/runs/{id}' as any, {
        params: { path: { id } },
      });
      if (res.data) setRun(res.data as RunDetail);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader className="text-[#d42422] animate-spin" size={32} />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p className="text-xl">Run not found.</p>
      </div>
    );
  }

  const embed = getVideoEmbed(run.videoUrl);
  const subcategoryVars = run.variableValues.filter((vv) => vv.variable.isSubcategory);
  const metadataVars = run.variableValues.filter((vv) => !vv.variable.isSubcategory);

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <ScrollReveal direction="up">
          <Link href={`/speedruns/${slug}`} className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to {run.game.name}
          </Link>

          {/* Status banner */}
          {run.status === 'PENDING' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <Clock3 size={20} className="text-yellow-400" />
              <span className="text-yellow-300 text-sm font-bold">This run is awaiting verification.</span>
            </div>
          )}
          {run.status === 'REJECTED' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <XCircle size={20} className="text-red-400" />
                <span className="text-red-300 text-sm font-bold">This run was rejected.</span>
              </div>
              {run.rejectionReason && (
                <p className="text-red-400/70 text-sm mt-2 ml-8">Reason: {run.rejectionReason}</p>
              )}
            </div>
          )}

          {/* Header */}
          <div className="bg-[#0a0f25] border border-white/10 rounded-[2rem] p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[#d42422] uppercase tracking-[0.2em] font-bold text-xs mb-2">
                  {run.game.name} &mdash; {run.category.name}
                  {run.level && ` (${run.level.name})`}
                </p>
                <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white">
                  {formatTime(run.timeMs)}
                </h1>
                {run.inGameTimeMs && (
                  <p className="text-xl font-mono text-gray-400 mt-1">
                    IGT: {formatTime(run.inGameTimeMs)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {run.status === 'VERIFIED' && <Badge variant="success"><CheckCircle size={12} /> Verified</Badge>}
                {run.status === 'PENDING' && <Badge variant="warning"><Clock3 size={12} /> Pending</Badge>}
                {run.status === 'REJECTED' && <Badge variant="danger"><XCircle size={12} /> Rejected</Badge>}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-1">
                  <Users size={12} /> Player{run.players.length > 1 ? 's' : ''}
                </div>
                <p className="text-white font-bold">
                  {run.players.map((p) => p.user?.name || p.guestName || 'Unknown').join(', ')}
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-1">
                  <Calendar size={12} /> Run Date
                </div>
                <p className="text-white font-bold">{new Date(run.runDate).toLocaleDateString()}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-1">
                  <Clock size={12} /> Submitted
                </div>
                <p className="text-white font-bold">{new Date(run.createdAt).toLocaleDateString()}</p>
              </div>
              {run.verifier && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-1">
                    <CheckCircle size={12} /> Verified by
                  </div>
                  <p className="text-white font-bold">{run.verifier.name || 'Admin'}</p>
                </div>
              )}
            </div>

            {/* Variable values */}
            {(subcategoryVars.length > 0 || metadataVars.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-6">
                {[...subcategoryVars, ...metadataVars].map((vv) => (
                  <span key={vv.variable.id} className="bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full text-xs font-bold">
                    {vv.variable.name}: {vv.value.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Video */}
          {embed ? (
            <div className="bg-[#0a0f25] border border-white/10 rounded-[2rem] overflow-hidden mb-6">
              <div className="aspect-video">
                <iframe
                  src={embed.embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          ) : run.videoUrl && (
            <div className="mb-6">
              <a
                href={run.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0a0f25] border border-white/10 rounded-2xl p-6 flex items-center gap-3 text-white hover:border-[#d42422]/50 transition-colors"
              >
                <Video size={20} className="text-[#d42422]" />
                <span className="font-bold">Watch Video</span>
                <span className="text-gray-500 text-sm truncate flex-1">{run.videoUrl}</span>
              </a>
            </div>
          )}

          {/* Description */}
          {run.description && (
            <div className="bg-[#0a0f25] border border-white/10 rounded-[2rem] p-8">
              <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Description</h3>
              <div
                className="prose prose-invert prose-sm max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: run.description }}
              />
            </div>
          )}
        </ScrollReveal>
      </div>
    </div>
  );
}
