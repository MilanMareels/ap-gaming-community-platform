"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { apiClient } from "@/api";
import type { RosterGameWithEntries } from "@/api";

export default function RosterPage() {
  const [games, setGames] = useState<RosterGameWithEntries[]>([]);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await apiClient.GET("/roster/games", {});
      if (res.data) {
        const data = res.data as RosterGameWithEntries[];
        setGames(data);
        if (data.length > 0 && activeGameId === null) {
          setActiveGameId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeGame = games.find((g) => g.id === activeGameId);
  const players = activeGame?.rosterEntries ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-24 px-4">
      <div className="container mx-auto">
        <ScrollReveal direction="up">
          <h1 className="text-5xl font-black text-center mb-4">
            TEAM <span className="text-red-600">ROSTERS</span>
          </h1>
          <p className="text-gray-400 text-center mb-12">Onze competitieve studenten.</p>
        </ScrollReveal>

        {games.length === 0 ? (
          <div className="text-center text-gray-500 py-12 border border-dashed border-slate-800 rounded-xl max-w-md mx-auto">Nog geen teams beschikbaar.</div>
        ) : (
          <>
            {/* Game Tabs */}
            <div className="flex justify-center flex-wrap gap-4 mb-12">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setActiveGameId(game.id)}
                  className={`px-6 py-3 rounded-full font-bold transition-all border ${
                    activeGameId === game.id ? "bg-red-600 border-red-500 text-white" : "bg-slate-900 border-slate-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {game.name}
                </button>
              ))}
            </div>

            {/* Player Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 justify-center gap-6 max-w-7xl mx-auto">
              {players.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 italic">Geen spelers in dit team.</div>
              ) : (
                players.map((entry, idx) => (
                  <ScrollReveal key={entry.id} direction="up" delay={idx * 50}>
                    <div className="h-full bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-red-500/50 hover:-translate-y-2 transition-all group text-center flex flex-col justify-between">
                      <div>
                        <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-red-600/20 group-hover:text-red-500 transition-colors">
                          <User size={32} />
                        </div>
                        <h3 className="text-xl font-black text-white truncate px-2" title={entry.handle}>
                          {entry.handle}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 truncate">{entry.user?.name || entry.user?.sNumber || ""}</p>
                      </div>

                      <div className="space-y-2">
                        {entry.role && (
                          <div className="flex justify-between text-xs p-2 bg-slate-950 rounded border border-slate-800/50">
                            <span className="text-gray-400">Role</span>
                            <span className="font-bold truncate max-w-25 text-right">{entry.role}</span>
                          </div>
                        )}
                        {entry.rank && (
                          <div className="flex justify-between text-xs p-2 bg-slate-950 rounded border border-slate-800/50">
                            <span className="text-gray-400">Rank</span>
                            <span className="font-bold text-red-500 truncate max-w-25 text-right">{entry.rank}</span>
                          </div>
                        )}
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
