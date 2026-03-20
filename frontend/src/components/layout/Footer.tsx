import Link from 'next/link';
import { Gamepad2, MessageCircle, ChevronRight, ExternalLink, Clock, FileText, Mail } from 'lucide-react';
import { SiInstagram, SiTwitch } from '@icons-pack/react-simple-icons';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#020618] relative overflow-hidden">
      {/* Subtle gradient line at top of footer */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#d42422]/50 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-16">
          <div className="md:col-span-5">
            <Link href="/" className="text-3xl font-semibold tracking-tight text-[#ffffff] flex items-center gap-2 mb-6">
              <Gamepad2 className="text-[#d42422] w-8 h-8" strokeWidth={1.5} />
              AP <span className="text-[#d42422]">Gaming</span>
            </Link>
            <p className="text-lg text-gray-400 max-w-sm mb-8 leading-relaxed">
              De officiële gaming en esports vereniging van de AP Hogeschool Antwerpen. Play, Compete, Connect.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/ap.gaming.community/"
                className="bg-white/5 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white hover:border-[#d42422] hover:bg-[#d42422]/10 transition-all"
              >
                <SiInstagram className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a
                href="https://www.twitch.tv/ap_gamingbe"
                className="bg-white/5 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white hover:border-[#d42422] hover:bg-[#d42422]/10 transition-all"
              >
                <SiTwitch className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a
                href="https://discord.gg/N5adyu3kXf"
                className="bg-white/5 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white hover:border-[#d42422] hover:bg-[#d42422]/10 transition-all"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="md:col-span-3 md:col-start-7">
            <h4 className="text-xl font-semibold tracking-tight text-white mb-6">Ontdek</h4>
            <ul className="space-y-4 text-lg text-gray-400">
              <li>
                <Link href="/#hub" className="hover:text-[#d42422] transition-colors flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> De Gaming Hub
                </Link>
              </li>
              <li>
                <Link href="/roster" className="hover:text-[#d42422] transition-colors flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> Esports Teams
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-[#d42422] transition-colors flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> Evenementen
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xl font-semibold tracking-tight text-white mb-6">Praktisch</h4>
            <ul className="space-y-4 text-lg text-gray-400">
              <li>
                <Link href="/reservations" className="hover:text-white transition-colors flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" strokeWidth={1.5} /> Reserveer Hub
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-white transition-colors flex items-center gap-2">
                  <Clock className="w-4 h-4" strokeWidth={1.5} /> Openingsuren
                </Link>
              </li>
              <li>
                <Link href="/info" className="hover:text-white transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" strokeWidth={1.5} /> Reglement
                </Link>
              </li>
              <li>
                <Link href="/info" className="hover:text-white transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" strokeWidth={1.5} /> Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-base">
          <p>&copy; {new Date().getFullYear()} AP Gaming Community. Alle rechten voorbehouden.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center md:text-left text-sm text-gray-600">
          Ontwikkeld door{' '}
          <a href="https://milanmareels.be/" className="text-[#d42422] hover:underline" target="_blank">
            Milan Mareels
          </a>{' '}
          en{' '}
          <a href="https://www.linkedin.com/in/stijn-voeten-237941103/" className="text-[#d42422] hover:underline" target="_blank">
            Stijn Voeten
          </a>
        </div>
      </div>
    </footer>
  );
}
