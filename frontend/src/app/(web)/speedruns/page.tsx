'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gamepad2, Loader, Timer } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';

interface SpeedrunGame {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  hasInGameTimer: boolean;
  _count: { runs: number; categories: number };
}

export default function SpeedrunsPage() {
  const [games, setGames] = useState<SpeedrunGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.GET('/speedruns/games' as any, {});
        if (res.data) setGames(res.data as SpeedrunGame[]);
      } catch (err) {
        console.error('Failed to fetch games:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-4">
          <Loader className="text-[#d42422] animate-bounce" size={32} />
          <span className="text-xl font-black italic tracking-widest">LOADING GAMES...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden">
      <div className="absolute -top-[400px] -right-[400px] w-[800px] h-[800px] bg-[#d42422]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-16">
            <h1 className="text-4xl md:text-8xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
              <Timer size={64} className="text-[#d42422]" />
              Speedruns
            </h1>
            <p className="text-[#d42422] tracking-[0.3em] font-bold text-sm mt-2 uppercase">// Leaderboards &amp; Records</p>
          </div>
        </ScrollReveal>

        {games.length === 0 ? (
          <div className="text-center text-gray-400 py-32 border border-white/5 bg-[#0a0f25]/50 backdrop-blur-sm rounded-[2rem]">
            <Gamepad2 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl tracking-widest uppercase">No games available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, idx) => (
              <ScrollReveal key={game.id} direction="up" delay={idx * 80}>
                <Link href={`/speedruns/${game.slug}`} className="block h-full">
                  <div className="bg-[#0a0f25] border border-white/10 rounded-[2rem] overflow-hidden hover:border-[#d42422]/50 hover:-translate-y-1 transition-all group h-full flex flex-col">
                    {game.coverImageUrl ? (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={`/api/${game.coverImageUrl}`}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Gamepad2 size={48} className="text-slate-700" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-black italic tracking-tight text-white uppercase group-hover:text-[#d42422] transition-colors">
                        {game.name}
                      </h3>
                      {game.description && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{game.description}</p>
                      )}
                      <div className="flex gap-3 mt-auto pt-4 text-xs text-gray-500">
                        <span>{game._count.categories} {game._count.categories === 1 ? 'category' : 'categories'}</span>
                        <span>&middot;</span>
                        <span>{game._count.runs} {game._count.runs === 1 ? 'run' : 'runs'}</span>
                        {game.hasInGameTimer && (
                          <>
                            <span>&middot;</span>
                            <span className="text-[#d42422]">IGT</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
