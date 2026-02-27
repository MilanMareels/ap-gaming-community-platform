'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import { apiClient } from '@/api';

const FAQS = [
  {
    question: 'Hoe reserveer ik een plaats?',
    answer:
      "Ga naar de 'Reservations' pagina via het menu. Vul je studentennummer en AP-email in, kies of je een PC of PS5 wilt gebruiken, en selecteer een beschikbaar tijdslot.",
  },
  {
    question: 'Wat als ik niet kom opdagen bij mijn reservatie?',
    answer:
      "Als je verhinderd bent, annuleer dan tijdig via Discord of mail. Bij een 'no-show' zonder afmelding krijg je een waarschuwing. Bij herhaling kan je account tijdelijk geblokkeerd worden.",
  },
  {
    question: "Welke PC's zijn er?",
    answer:
      "Onze e-sports ruimte beschikt over High-End gaming PC's met krachtige RTX 50-series videokaarten en snelle processoren, gekoppeld aan 180Hz monitoren voor competitieve gameplay.",
  },
  {
    question: 'Welke games mag ik spelen?',
    answer:
      'Je mag alle vooraf geïnstalleerde games spelen (o.a. Valorant, LoL, CS2, Overwatch 2). Het installeren van eigen software of illegale content is streng verboden.',
  },
  {
    question: 'Hoelang mag ik huren en blijven gamen?',
    answer:
      'Je kan maximaal 4 uur per dag reserveren. Dit limiet zorgt ervoor dat zoveel mogelijk studenten gebruik kunnen maken van de faciliteiten.',
  },
  {
    question: 'Kan ik ook op de PS5 of Nintendo Switch spelen?',
    answer:
      "Zeker! Naast de PC's hebben we consoles met populaire titels. Voor PS5 hebben we o.a. FC 26, Elden Ring en Gran Turismo 7. Voor de Switch zijn er partygames zoals Mario Kart 8 en Super Smash Bros Ultimate.",
  },
  {
    question: "Hoe werken de 'Fysieke' games in de lijst?",
    answer:
      "Games die als 'Fysiek' staan aangegeven (vooral Switch en sommige PS5 titels) moet je even ophalen bij de beheerder. We vragen meestal je studentenkaart als tijdelijk onderpand.",
  },
];

export default function InfoPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [formUrl, setFormUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.GET('/settings', {});
        if (res.data) {
          const settings = res.data as unknown as Array<{
            key: string;
            value: string;
          }>;
          const formSetting = settings.find((s) => s.key === 'googleFormUrl');
          if (formSetting) setFormUrl(formSetting.value);
        }
      } catch {
        // ignore
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className='min-h-screen bg-slate-950 py-24 px-4 text-white'>
      <div className='container mx-auto max-w-4xl'>
        <h1 className='text-5xl font-black mb-12 text-center'>
          HUB <span className='text-red-600'>INFO</span>
        </h1>

        <div className='grid md:grid-cols-2 gap-8 mb-16'>
          <div className='bg-[#5865F2] p-8 rounded-3xl flex flex-col items-center text-center hover:scale-105 transition-transform cursor-pointer'>
            <MessageCircle size={64} className='text-white mb-4' />
            <h2 className='text-3xl font-bold mb-2'>Join Discord</h2>
            <p className='text-white/80 mb-6'>
              Chat met andere studenten, vind teammates en blijf op de hoogte.
            </p>
            <a
              href='https://discord.gg/FGCC9GTetC'
              target='_blank'
              rel='noopener noreferrer'
              className='bg-white text-[#5865F2] px-8 py-3 rounded-full font-bold'
            >
              Join Server
            </a>
          </div>

          <div className='bg-slate-900 border border-slate-800 p-8 rounded-3xl'>
            <h3 className='text-2xl font-bold mb-4 flex items-center gap-2'>
              <Shield className='text-red-500' /> Huisregels
            </h3>
            <ul className='space-y-3 text-gray-400 list-disc pl-5'>
              <li>
                Eten en drinken is <strong>verboden</strong> bij de apparatuur.
              </li>
              <li>Respecteer de reservatietijden.</li>
              <li>Toxic gedrag wordt niet getolereerd.</li>
              <li>Log uit na gebruik van PC/Console.</li>
            </ul>
          </div>
        </div>

        {formUrl && (
          <div className='mb-16 w-full'>
            <h2 className='text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3'>
              <ClipboardList className='text-red-600' size={32} /> Aanvraag /
              Feedback
            </h2>

            <div className='flex flex-col items-center w-full'>
              <a
                href={formUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='group relative w-full inline-flex items-center justify-center gap-3 bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-6 px-10 rounded-2xl transition-all duration-200 shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] text-xl uppercase tracking-wide border-2 border-red-400/50 hover:border-red-300'
              >
                <span>Open formulier</span>
                <span
                  className='text-3xl group-hover:rotate-12 transition-transform duration-200'
                  role='img'
                  aria-label='controller'
                >
                  🎮
                </span>
              </a>
            </div>
          </div>
        )}

        <div className='max-w-7xl mx-auto'>
          <h2 className='text-3xl font-bold mb-8 text-center'>
            Veelgestelde Vragen
          </h2>
          <div className='space-y-4'>
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700'
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className='w-full flex items-center justify-between p-6 text-left font-bold focus:outline-none cursor-pointer'
                >
                  {faq.question}
                  {openIndex === index ? (
                    <ChevronUp className='text-red-500' />
                  ) : (
                    <ChevronDown className='text-gray-500' />
                  )}
                </button>
                {openIndex === index && (
                  <div className='p-6 pt-2 text-gray-400 border-t border-slate-800/50 leading-relaxed'>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
