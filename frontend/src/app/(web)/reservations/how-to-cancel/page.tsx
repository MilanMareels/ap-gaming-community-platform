'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Ban, CalendarPlus, Check, Clock, Lock, Mail, MousePointer2, Smile, User, XCircle } from 'lucide-react';
import { NoShowTracker } from '@/components/reservations/NoShowTracker';
import DiscordIcon from '@/components/ui/DiscordIcon';

type Route = 'profile' | 'email';

/** Where the "reservation starts" boundary sits on the timing bar, in percent. */
const CANCEL_BOUNDARY = 70;

const ROUTES: { id: Route; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Via je profiel', icon: User },
  { id: 'email', label: 'Via de e-mail', icon: Mail },
];

const STEPS: Record<Route, { title: string; text: string; visual: React.ReactNode }[]> = {
  profile: [
    { title: 'Log in', text: 'Log in op de website met je AP Microsoft-account.', visual: <LoginVisual /> },
    { title: 'Open je profiel', text: "Klik rechtsboven op 'Profiel' om je reservaties te zien.", visual: <ProfileNavVisual /> },
    { title: 'Klik op annuleren', text: "Kies de reservatie en klik op 'Annuleren'. Klaar!", visual: <CancelRowVisual /> },
  ],
  email: [
    { title: 'Open de bevestigingsmail', text: 'Zoek de mail die je kreeg toen je reserveerde.', visual: <InboxVisual /> },
    { title: "Klik op 'Reservatie annuleren'", text: 'Onderaan de mail staat een rode knop.', visual: <EmailButtonVisual /> },
    { title: 'Bevestig', text: "Bevestig op de website met 'Ja, annuleer reservatie'.", visual: <ConfirmVisual /> },
  ],
};

const STRIKES = [
  {
    count: 1,
    title: 'Herinnering',
    text: 'Je krijgt een vriendelijke mail. Dat kan iedereen eens overkomen.',
    icon: Mail,
    accent: 'text-yellow-400',
    ring: 'border-yellow-500/30',
  },
  {
    count: 2,
    title: 'Waarschuwing',
    text: 'Je krijgt een waarschuwing: nog één no-show en je kan niet meer reserveren.',
    icon: AlertTriangle,
    accent: 'text-orange-400',
    ring: 'border-orange-500/40',
  },
  {
    count: 3,
    title: 'Geblokkeerd',
    text: 'Je kan geen nieuwe reservaties meer maken tot een medewerker je deblokkeert.',
    icon: Lock,
    accent: 'text-red-400',
    ring: 'border-red-500/50',
  },
];

export default function HowToCancelPage() {
  const [route, setRoute] = useState<Route>('profile');

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 md:px-6 relative overflow-hidden">
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#d42422] rounded-full blur-[180px] opacity-[0.07] pointer-events-none z-[-1]" />

      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#d42422] mb-4">
            <Clock size={14} /> Kan je niet komen?
          </span>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
            Reservatie <span className="text-[#d42422]">annuleren</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto mt-4 text-lg">
            Annuleer op voorhand, dan geef je je plek vrij voor een andere student. Het duurt maar een paar seconden en telt nooit als no-show.
          </p>
        </motion.div>

        {/* Route picker */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            {ROUTES.map((r) => {
              const Icon = r.icon;
              const active = route === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRoute(r.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm md:text-base font-medium transition-colors ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="route-pill"
                      className="absolute inset-0 bg-[#d42422] rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon size={18} /> {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.ol
            key={route}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative grid gap-6 md:grid-cols-3"
          >
            {/* Connector line behind the step badges (desktop) */}
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: 'easeInOut' }}
              className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-linear-to-r from-[#d42422]/0 via-[#d42422]/60 to-[#d42422]/0 origin-left"
            />
            {STEPS[route].map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.2, type: 'spring', stiffness: 120, damping: 16 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 w-12 h-12 rounded-full bg-[#d42422] text-white text-xl font-black flex items-center justify-center shadow-[0_0_25px_rgba(212,36,34,0.5)] mb-5">
                  {i + 1}
                </div>
                <div className="w-full bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex-1 flex flex-col">
                  <div className="h-40 rounded-2xl bg-white/[0.03] border border-white/5 mb-5 relative overflow-hidden flex items-center justify-center">
                    {step.visual}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </AnimatePresence>

        {/* Timing */}
        <Section title="Tot wanneer kan ik annuleren?">
          <div className="bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            {/* Every layer is positioned against the same track, so the zones and the boundary line stay aligned at any width */}
            <div className="relative h-14 rounded-full overflow-hidden border border-white/10 text-sm font-semibold">
              <div className="absolute inset-0 bg-red-500/10 flex items-center justify-end px-3 sm:px-5 text-red-300 whitespace-nowrap">
                <Ban size={18} className="mr-2 shrink-0 hidden sm:block" /> Te laat
              </div>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${CANCEL_BOUNDARY}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 overflow-hidden bg-green-500/15 flex items-center px-3 sm:px-5 text-green-300 whitespace-nowrap"
              >
                <Check size={18} className="mr-2 shrink-0" /> Annuleren kan
              </motion.div>
              <motion.div
                initial={{ left: '0%' }}
                whileInView={{ left: `${CANCEL_BOUNDARY}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute inset-y-0 w-1 -ml-0.5 bg-white shadow-[0_0_12px_white]"
              />
            </div>
            <div className="relative h-6 mt-2 text-xs text-gray-400">
              <span className="absolute left-0">Nu</span>
              <span className="absolute -translate-x-1/2 whitespace-nowrap text-white font-semibold" style={{ left: `${CANCEL_BOUNDARY}%` }}>
                Start van je reservatie
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-4 leading-relaxed">
              Je kan annuleren tot het begin van je reservatie. Daarna kan dat niet meer. Kom je dan niet opdagen, dan telt dat als een no-show.
            </p>
          </div>
        </Section>

        {/* No-show policy */}
        <Section title="Wat gebeurt er bij een no-show?">
          <p className="text-gray-400 text-center max-w-2xl mx-auto -mt-4 mb-8">
            Kom je niet opdagen zonder te annuleren? Dan noteren we een no-show. Na <strong className="text-white">3 no-shows</strong> kan je niet
            meer reserveren.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {STRIKES.map((strike, i) => {
              const Icon = strike.icon;
              return (
                <motion.div
                  key={strike.count}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.2, type: 'spring', stiffness: 120, damping: 16 }}
                  className={`bg-[#020618]/80 backdrop-blur-xl border ${strike.ring} rounded-3xl p-6 flex flex-col items-center text-center`}
                >
                  <NoShowTracker count={strike.count} limit={3} size={32} animateOnView />
                  <div className="flex items-center gap-2 mt-5 mb-2">
                    <Icon size={20} className={strike.accent} />
                    <h3 className="text-lg font-bold text-white">
                      {strike.count}e no-show: {strike.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{strike.text}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-400 text-center">
            <span>Geblokkeerd of denk je dat er iets misging? Spreek een medewerker aan in de Gaming Hub of</span>
            <a
              href="https://discord.gg/FGCC9GTetC"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 rounded-full px-4 py-1.5 transition-colors"
            >
              <DiscordIcon size={16} /> contacteer ons via Discord
            </a>
          </div>
        </Section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 bg-[#d42422] hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(212,36,34,0.4)] active:scale-95"
          >
            Naar mijn reservaties <ArrowRight size={18} />
          </Link>
          <Link
            href="/reservations"
            className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white px-6 py-3 rounded-full font-medium transition-colors"
          >
            <CalendarPlus size={18} /> Nieuwe reservatie
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-20">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl md:text-4xl font-black italic text-white uppercase text-center mb-8"
      >
        {title}
      </motion.h2>
      {children}
    </section>
  );
}

/* ───────────── Step illustrations ───────────── */

/** Pointer that glides onto a target and "clicks" it, on a loop. */
function Cursor({ from, to, delay = 0.6 }: { from: { x: number; y: number }; to: { x: number; y: number }; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className="absolute z-20 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      initial={{ x: from.x, y: from.y, opacity: 0 }}
      animate={{ x: [from.x, to.x, to.x, to.x], y: [from.y, to.y, to.y, to.y], opacity: [0, 1, 1, 0], scale: [1, 1, 0.8, 1] }}
      transition={{ duration: 2.6, delay, times: [0, 0.45, 0.6, 1], repeat: Infinity, repeatDelay: 1 }}
      style={{ left: '50%', top: '50%' }}
    >
      <MousePointer2 size={22} fill="white" />
    </motion.div>
  );
}

/** Pulsing glow used to highlight the element the cursor clicks. */
function pulse(delay = 0.6) {
  return {
    animate: { boxShadow: ['0 0 0 0 rgba(212,36,34,0)', '0 0 0 0 rgba(212,36,34,0)', '0 0 0 6px rgba(212,36,34,0.45)', '0 0 0 0 rgba(212,36,34,0)'] },
    transition: { duration: 2.6, delay, times: [0, 0.5, 0.62, 1], repeat: Infinity, repeatDelay: 1 },
  };
}

function LoginVisual() {
  return (
    <>
      <div className="w-44 rounded-xl bg-[#0a0f25] border border-white/10 p-3 space-y-2">
        <div className="h-2 w-20 rounded bg-white/20 mx-auto" />
        <motion.div {...pulse()} className="flex items-center justify-center gap-2 rounded-lg bg-white text-black text-[11px] font-semibold py-2">
          <span className="grid grid-cols-2 gap-[1px]">
            <span className="w-1.5 h-1.5 bg-[#f25022]" />
            <span className="w-1.5 h-1.5 bg-[#7fba00]" />
            <span className="w-1.5 h-1.5 bg-[#00a4ef]" />
            <span className="w-1.5 h-1.5 bg-[#ffb900]" />
          </span>
          Login met Microsoft
        </motion.div>
      </div>
      <Cursor from={{ x: 60, y: 50 }} to={{ x: 10, y: 8 }} />
    </>
  );
}

function ProfileNavVisual() {
  return (
    <>
      <div className="w-52 rounded-xl bg-[#0a0f25] border border-white/10 px-3 py-2.5 flex items-center justify-between absolute top-6">
        <div className="flex gap-1.5">
          <div className="h-1.5 w-6 rounded bg-white/20" />
          <div className="h-1.5 w-6 rounded bg-white/20" />
          <div className="h-1.5 w-6 rounded bg-white/20" />
        </div>
        <motion.div {...pulse()} className="flex items-center gap-1 rounded-full border border-white/20 text-[10px] text-white px-2 py-1">
          <User size={10} /> Profiel
        </motion.div>
      </div>
      <div className="absolute bottom-5 w-52 space-y-1.5 opacity-40">
        <div className="h-2 w-32 rounded bg-white/20" />
        <div className="h-2 w-40 rounded bg-white/10" />
      </div>
      <Cursor from={{ x: -40, y: 50 }} to={{ x: 70, y: -38 }} />
    </>
  );
}

function CancelRowVisual() {
  return (
    <>
      <div className="w-52 rounded-xl bg-[#0a0f25] border border-white/10 p-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10" />
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-14 rounded bg-white/30" />
          <div className="h-1.5 w-10 rounded bg-white/15" />
        </div>
        <motion.div
          animate={{ backgroundColor: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(212,36,34,1)', 'rgba(212,36,34,1)'] }}
          transition={{ duration: 2.6, delay: 0.6, times: [0, 0.55, 0.62, 1], repeat: Infinity, repeatDelay: 1 }}
          className="flex items-center gap-1 rounded-full border border-white/15 text-[10px] text-white px-2 py-1"
        >
          <XCircle size={10} /> Annuleren
        </motion.div>
      </div>
      <Cursor from={{ x: -50, y: 50 }} to={{ x: 62, y: -2 }} />
    </>
  );
}

function InboxVisual() {
  return (
    <div className="w-52 rounded-xl bg-[#0a0f25] border border-white/10 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={i === 0 ? { backgroundColor: 'rgba(212,36,34,0)' } : undefined}
          animate={i === 0 ? { backgroundColor: ['rgba(212,36,34,0)', 'rgba(212,36,34,0.18)', 'rgba(212,36,34,0)'] } : undefined}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.6 }}
          className={`flex items-center gap-2 px-3 py-2 ${i < 2 ? 'border-b border-white/5' : ''}`}
        >
          <Mail size={12} className={i === 0 ? 'text-[#d42422]' : 'text-gray-600'} />
          {i === 0 ? (
            <span className="text-[10px] text-white font-semibold truncate">Reservatie Bevestiging - AP Gaming Hub</span>
          ) : (
            <div className="h-1.5 rounded bg-white/10" style={{ width: `${60 - i * 15}%` }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function EmailButtonVisual() {
  return (
    <>
      <div className="w-44 rounded-xl bg-white overflow-hidden">
        <div className="bg-[#DC2626] text-white text-[10px] font-bold text-center py-1.5">AP Gaming Hub</div>
        <div className="p-3 space-y-1.5">
          <div className="h-1.5 w-full rounded bg-gray-200" />
          <div className="h-1.5 w-4/5 rounded bg-gray-200" />
          <motion.div {...pulse()} className="mt-2 rounded bg-[#DC2626] text-white text-[10px] font-semibold text-center py-1.5">
            Reservatie annuleren
          </motion.div>
        </div>
      </div>
      <Cursor from={{ x: 70, y: 60 }} to={{ x: 20, y: 30 }} />
    </>
  );
}

function ConfirmVisual() {
  return (
    <div className="relative w-44 h-28">
      <motion.div
        animate={{ opacity: [1, 1, 0, 0, 1], scale: [1, 1, 0.9, 0.9, 1] }}
        transition={{ duration: 3.6, times: [0, 0.4, 0.5, 0.95, 1], repeat: Infinity }}
        className="absolute inset-0 rounded-xl bg-[#0a0f25] border border-white/10 p-3 flex flex-col items-center justify-center gap-2"
      >
        <div className="h-1.5 w-24 rounded bg-white/20" />
        <div className="w-full rounded-lg bg-[#d42422] text-white text-[10px] font-semibold text-center py-1.5">Ja, annuleer reservatie</div>
        <div className="w-full rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[10px] text-center py-1.5">Nee, behoud</div>
      </motion.div>
      <motion.div
        animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.6, 0.6, 1, 1, 0.6] }}
        transition={{ duration: 3.6, times: [0, 0.45, 0.55, 0.95, 1], repeat: Infinity }}
        className="absolute inset-0 rounded-xl bg-green-500/10 border border-green-500/30 flex flex-col items-center justify-center gap-1 text-green-300"
      >
        <Smile size={28} />
        <span className="text-xs font-semibold">Geannuleerd!</span>
      </motion.div>
    </div>
  );
}
