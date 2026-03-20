'use client';

import { useState, useEffect } from 'react';
import { User, Trophy, Crosshair, Map, Shield } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { RosterGameWithEntries } from '@/api';

export default function RosterPage() {
  const [games, setGames] = useState<RosterGameWithEntries[]>([]);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await apiClient.GET('/roster/games', {});
      if (res.data) {
        const data = res.data as RosterGameWithEntries[];
        setGames(data);
        if (data.length > 0 && activeGameId === null) {
          setActiveGameId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeGame = games.find((g) => g.id === activeGameId);
  const players = activeGame?.rosterEntries ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020618] flex items-center justify-center text-white relative z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#d42422]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020618] py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 inset-x-0 w-full h-[600px] bg-gradient-to-b from-[#d42422]/10 to-transparent pointer-events-none"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16 relative">
            <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-500 uppercase">
              AP{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff4444] via-[#d42422] via-80% to-[#990000] pr-4 md:ml-4">
                Esports
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-4 tracking-widest uppercase font-semibold">Meet the Elite</p>
          </div>
        </ScrollReveal>

        {games.length === 0 ? (
          <div className="text-center text-gray-500 py-24 bg-[#0a0f25] border border-white/10 rounded-3xl max-w-2xl mx-auto backdrop-blur-sm">
            No active rosters at the moment.
          </div>
        ) : (
          <>
            {/* Dynamic Game Navigation */}
            <div className="flex justify-center flex-wrap gap-4 mb-20">
              {games.map((game) => {
                const isActive = activeGameId === game.id;
                return (
                  <button
                    key={game.id}
                    onClick={() => setActiveGameId(game.id)}
                    className={`group relative px-10 py-4 transform hover:scale-105 transition-all duration-300 ${isActive ? 'scale-105' : ''}`}
                  >
                    <div
                      className={`absolute inset-0 skew-x-[-15deg] border-2 transition-all duration-300 ${isActive ? 'bg-[#d42422] border-[#ff4444] shadow-[0_0_30px_rgba(212,36,34,0.6)]' : 'bg-[#0a0f25] border-white/10 group-hover:bg-[#151c35] group-hover:border-white/30'}`}
                    ></div>
                    <span
                      className={`relative z-10 font-bold tracking-widest uppercase ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                    >
                      {game.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Character-Select Style Roster Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
              {players.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 italic bg-[#0a0f25]/80 backdrop-blur-xl border border-white/10 p-12 rounded-2xl">
                  No players recruited yet.
                </div>
              ) : (
                players.map((entry, idx) => (
                  <ScrollReveal key={entry.id} direction="up" delay={idx * 100}>
                    <div className="group relative h-[450px] bg-[#0a0f25] rounded-tl-3xl rounded-br-3xl overflow-hidden border border-white/10 hover:border-[#d42422] transition-all duration-500">
                      {/* Backsplash Glow / Image Placeholder */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-[#020618]/80 to-transparent z-10"></div>
                      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#d42422] mix-blend-screen rounded-full blur-[100px] opacity-10 group-hover:opacity-40 transition-all duration-700"></div>

                      {/* Faux Player Image / Graphic */}
                      <div className="absolute top-0 inset-x-0 h-[250px] bg-white/5 flex items-center justify-center overflow-hidden">
                        <div className="text-[200px] text-white/5 absolute -bottom-10 -right-10 font-black italic">{idx + 1}</div>
                        <User
                          size={120}
                          className="text-white/20 group-hover:scale-110 group-hover:text-[#d42422]/40 transition-all duration-700"
                          strokeWidth={1}
                        />
                      </div>

                      {/* Content overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end h-full">
                        <div className="translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          <h3
                            className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg mb-1 wrap-break-word"
                            title={entry.handle}
                          >
                            {entry.handle}
                          </h3>
                          <p className="text-gray-400 font-medium mb-6 flex items-center gap-2">
                            <span className="w-6 h-[2px] bg-[#d42422]"></span>
                            {entry.user?.name || entry.user?.sNumber || 'Unknown Operative'}
                          </p>

                          <div className="grid grid-cols-2 gap-3 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                            {entry.role && (
                              <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Crosshair size={12} /> Role
                                </p>
                                <p className="font-bold text-gray-200 truncate">{entry.role}</p>
                              </div>
                            )}
                            {entry.rank && (
                              <div className="bg-[#d42422]/10 backdrop-blur-md rounded-xl p-3 border border-[#d42422]/30">
                                <p className="text-xs text-[#d42422]/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Trophy size={12} /> Rank
                                </p>
                                <p className="font-bold text-[#d42422] truncate">{entry.rank}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
