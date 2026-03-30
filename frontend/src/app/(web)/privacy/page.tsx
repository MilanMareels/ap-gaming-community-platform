'use client';

import { Shield, Lock, Eye, FileText, Mail } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export default function PrivacyPage() {
  return (
    <ScrollReveal direction='up'>
      <div className='min-h-screen py-24 px-4 text-white relative overflow-hidden font-sans'>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d42422]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className='container mx-auto max-w-4xl relative z-10'>
          <h1 className='text-5xl font-black mb-12 text-center'>
            PRIVACY <span className='text-red-600'>BELEID</span>
          </h1>

          <div className='space-y-8 text-gray-300 leading-relaxed'>
            <section className='bg-[#0a0f25]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-colors'>
              <h2 className='text-2xl font-bold text-white mb-4 flex items-center gap-3'>
                <Eye className='text-red-500' /> Welke gegevens verzamelen we?
              </h2>
              <p>
                Wanneer je een reservatie maakt op de AP Gaming Hub, verzamelen
                we de volgende gegevens:
              </p>
              <ul className='list-disc pl-6 mt-4 space-y-2 text-gray-400'>
                <li>
                  <strong className='text-white'>
                    Studentennummer (s-nummer):
                  </strong>{' '}
                  Dit gebruiken we om te verifiëren dat je een actieve student
                  bent aan de AP Hogeschool.
                </li>
                <li>
                  <strong className='text-white'>AP Emailadres:</strong> We
                  slaan je studentenmail op om je reservatiebevestiging te
                  sturen en je te kunnen bereiken indien nodig.
                </li>
                <li>
                  <strong className='text-white'>Reservatie details:</strong> De
                  datum, tijd en het type hardware (PC of Console) dat je
                  reserveert.
                </li>
              </ul>
            </section>

            <section className='bg-[#0a0f25]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-colors'>
              <h2 className='text-2xl font-bold text-white mb-4 flex items-center gap-3'>
                <FileText className='text-red-500' /> Waarom hebben we deze
                gegevens nodig?
              </h2>
              <p>
                We gebruiken deze gegevens uitsluitend voor het beheer van de
                Gaming Hub faciliteiten:
              </p>
              <ul className='list-disc pl-6 mt-4 space-y-2 text-gray-400'>
                <li>
                  Om te zorgen dat alleen gerechtigde studenten toegang krijgen.
                </li>
                <li>Om dubbele boekingen te voorkomen.</li>
                <li>
                  Om contact op te nemen bij wijzigingen, annuleringen of
                  no-shows.
                </li>
                <li>
                  Om misbruik van de apparatuur te kunnen koppelen aan een
                  gebruiker.
                </li>
              </ul>
            </section>

            <section className='bg-[#0a0f25]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-colors'>
              <h2 className='text-2xl font-bold text-white mb-4 flex items-center gap-3'>
                <Lock className='text-red-500' /> Opslag en Beveiliging
              </h2>
              <p>
                Je gegevens worden veilig opgeslagen in onze database. We delen
                deze gegevens niet met derden, tenzij dit strikt noodzakelijk is
                voor de werking van de hogeschool of indien wettelijk verplicht.
                Alleen de beheerders van de AP Gaming Hub hebben toegang tot
                deze informatie.
              </p>
            </section>

            <section className='bg-[#0a0f25]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-colors'>
              <h2 className='text-2xl font-bold text-white mb-4 flex items-center gap-3'>
                <Shield className='text-red-500' /> Jouw Rechten & Contact
              </h2>
              <p className='mb-6'>
                Je hebt altijd het recht om te vragen welke gegevens we van je
                hebben, of om deze te laten verwijderen als je de service niet
                meer wilt gebruiken.
              </p>

              <div className='bg-black/40 p-6 rounded-xl border border-white/10 flex items-start gap-4'>
                <div className='bg-red-600/10 p-3 rounded-full'>
                  <Mail className='text-red-500' size={24} />
                </div>
                <div>
                  <h3 className='font-bold text-white text-lg'>
                    Heb je vragen of wil je contact opnemen?
                  </h3>
                  <p className='text-gray-400 mt-1'>
                    Voor privacy-gerelateerde vragen kan je terecht bij de
                    beheerder/ontwikkelaar:
                  </p>
                  <a
                    href='mailto:milan.mareels@student.ap.be'
                    className='text-red-500 font-bold hover:underline mt-2 inline-block'
                  >
                    milan.mareels@student.ap.be
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
