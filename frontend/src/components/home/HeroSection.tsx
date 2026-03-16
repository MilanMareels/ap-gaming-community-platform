import Link from 'next/link';
import { CalendarPlus, Clock } from 'lucide-react';

export function HeroSection() {
  return (
    <main className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden">
      {/* Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-[#d42422] rounded-full blur-[120px] md:blur-[200px] opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10">
        <Link
          href="#hub"
          className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-10 text-lg hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d42422] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d42422]"></span>
          </span>
          <span className="text-gray-200 group-hover:text-white transition-colors">
            De fysieke AP Gaming Hub is <span className="text-[#d42422] font-medium">officieel open!</span>
          </span>
        </Link>

        <h1 className="text-6xl md:text-8xl font-semibold tracking-tight leading-[1.1] mb-8">
          Jouw <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d42422] to-orange-500">AP-sist</span>
          <br /> in Gaming &amp; Esports.
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mb-12 font-medium leading-relaxed">
          Dé community van de AP Hogeschool Antwerpen. Kom chillen tussen de lessen door in onze fysieke Gaming Hub, of vertegenwoordig AP in een van
          onze competitieve esports rosters.
        </p>

        <div className="flex flex-col sm:flex-row gap-5">
          <Link
            href="/reservations"
            className="bg-[#d42422] text-[#ffffff] px-8 py-4 rounded-full text-xl font-medium hover:bg-red-700 transition-all hover:-translate-y-1 inline-flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(212,36,34,0.3)]"
          >
            Reserveer je setup <CalendarPlus strokeWidth={1.5} />
          </Link>
          <Link
            href="/schedule"
            className="bg-white/5 border border-white/10 text-[#ffffff] px-8 py-4 rounded-full text-xl font-medium hover:bg-white/10 hover:border-white/20 transition-all inline-flex items-center justify-center gap-3"
          >
            Bekijk openingsuren <Clock strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </main>
  );
}
