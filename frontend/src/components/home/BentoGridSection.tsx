import Link from 'next/link';
import { Swords, ArrowRight, Ticket } from 'lucide-react';

export function BentoGridSection() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6 relative">
      <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-16 text-center">Meer dan alleen een Hub</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Esports Card */}
        <div
          id="esports"
          className="rounded-[2.5rem] border border-white/10 bg-[#020618] p-10 flex flex-col relative overflow-hidden group hover:border-[#d42422]/50 transition-colors z-10"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#d42422] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"></div>

          <div className="bg-[#0a0f25] border border-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
            <Swords className="w-8 h-8 text-[#d42422]" strokeWidth={1.5} />
          </div>

          <h3 className="text-3xl font-semibold tracking-tight mb-4">Competitieve Esports</h3>
          <p className="text-lg text-gray-400 mb-10 flex-grow leading-relaxed">
            Wij ondersteunen officiële AP teams in diverse games zoals League of Legends, Valorant, CS2 en Rocket League. Ben jij klaar om de kleuren
            van AP te verdedigen in de studentencompetities?
          </p>

          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <span className="text-gray-400 text-lg">Ontdek onze teams</span>
            <Link
              href="/roster"
              className="bg-white/10 p-3 rounded-full text-white hover:bg-[#d42422] hover:text-white transition-all group-hover:translate-x-2"
            >
              <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Events Card */}
        <div
          id="events"
          className="rounded-[2.5rem] border border-white/10 bg-[#020618] p-10 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-colors z-10"
        >
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none"></div>

          <div className="bg-[#0a0f25] border border-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
            <Ticket className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
          </div>

          <h3 className="text-3xl font-semibold tracking-tight mb-4">Epische Events</h3>
          <p className="text-lg text-gray-400 mb-10 flex-grow leading-relaxed">
            Van gigantische LAN-party&apos;s in de grote hallen van de campus tot gezellige viewing party&apos;s voor grote toernooien in de hub. Zorg
            dat je geen enkel moment mist van onze community.
          </p>

          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <span className="text-gray-400 text-lg">Bekijk de kalender</span>
            <Link
              href="/events"
              className="bg-white/10 p-3 rounded-full text-white hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-2"
            >
              <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
