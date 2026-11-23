'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Ban, CalendarCheck, ChevronDown, ChevronUp, Cpu, Gavel, ScrollText, Users } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { apiClient } from '@/api';
import DiscordIcon from '@/components/ui/DiscordIcon';

type ReservationRules = { maxPerDay: number; minGapMinutes: number };

/** Describes the configured per-member limits; a session lasts at most 2 hours. */
function describeSessionRules({ maxPerDay, minGapMinutes }: ReservationRules): string {
  const parts = ['Een sessie duurt 1, 1,5 of 2 uur.'];
  if (maxPerDay > 0) parts.push(`Je kan maximaal ${maxPerDay} ${maxPerDay === 1 ? 'reservatie' : 'reservaties'} per dag maken.`);
  // With one reservation a day there is no second one to keep apart from, so the gap means nothing to the reader
  if (minGapMinutes > 0 && maxPerDay !== 1) parts.push(`Tussen twee van je reservaties moet minstens ${minGapMinutes} minuten zitten.`);
  parts.push('Zo kunnen zo veel mogelijk studenten gebruikmaken van de faciliteiten.');
  return parts.join(' ');
}

const FAQS: { question: string; answer: string | ((rules: ReservationRules) => string); link?: { href: string; label: string } }[] = [
  {
    question: 'Hoe reserveer ik een plaats?',
    answer:
      "Ga via het menu naar de pagina 'Reservaties' en log in met je AP Microsoft-account. Kies of je een pc, PS5 of Switch wilt gebruiken en selecteer een beschikbaar tijdslot.",
  },
  {
    question: 'Hoe annuleer ik mijn reservatie?',
    answer:
      "Log in en ga naar 'Profiel', of klik op 'Reservatie annuleren' in je bevestigingsmail. Je kan annuleren tot het begin van je reservatie.",
    link: { href: '/reservations/how-to-cancel', label: 'Bekijk de stap-voor-stap uitleg' },
  },
  {
    question: 'Wat als ik niet kom opdagen bij mijn reservatie?',
    answer:
      'Kom je niet opdagen zonder te annuleren, dan krijg je een no-show. Bij je eerste no-show krijg je een herinnering, bij de tweede een waarschuwing en na drie no-shows per semester kan je niet meer reserveren. Bij een nieuw semester worden je no-shows gereset.',
    link: { href: '/reservations/how-to-cancel', label: 'Meer over het no-show beleid' },
  },
  {
    question: "Welke PC's zijn er?",
    answer:
      "Onze e-sportsruimte beschikt over high-end gaming-pc's met krachtige RTX 50-serie videokaarten en snelle processors, gekoppeld aan 180Hz-monitoren voor competitieve gameplay.",
  },
  {
    question: 'Welke games mag ik spelen?',
    answer:
      'Je mag alle vooraf geïnstalleerde games spelen (o.a. Valorant, LoL, CS2, Overwatch 2). Het installeren van eigen software of illegale content is streng verboden.',
  },
  {
    question: 'Hoelang mag ik huren en blijven gamen?',
    answer: describeSessionRules,
  },
  {
    question: 'Kan ik ook op de PS5 of Nintendo Switch spelen?',
    answer:
      "Zeker! Naast de PC's hebben we consoles met populaire titels. Voor PS5 hebben we o.a. FC 26, Elden Ring en Gran Turismo 7. Voor de Switch zijn er partygames zoals Mario Kart 8 en Super Smash Bros Ultimate.",
  },
  {
    question: "Hoe werken de 'Fysieke' games in de lijst?",
    answer:
      "Games die als 'fysiek' aangeduid staan (vooral op Switch en bij sommige PS5-titels) haal je op bij de beheerder. We vragen meestal je studentenkaart als tijdelijk onderpand.",
  },
];

/** The date at the top of the reglement; change it with every change to the rules below. */
const LAST_UPDATED = '23 november 2026';

type Section = { id: string; title: string; icon: typeof Users; intro?: ReactNode; articles: { title: string; body: ReactNode }[] };

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#d42422] underline underline-offset-2 hover:text-white">
    {children}
  </a>
);

const InternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-[#d42422] underline underline-offset-2 hover:text-white">
    {children}
  </Link>
);

function buildSections(sessionRules: string): Section[] {
  return [
    {
      id: 'toegang',
      title: 'Toegang en reservaties',
      icon: CalendarCheck,
      articles: [
        {
          title: 'Wie mag er gamen',
          body: 'De Gaming Hub is er voor studenten van AP Hogeschool met een geldige studentenkaart. Toon je kaart wanneer een medewerker erom vraagt.',
        },
        {
          title: 'Openingsuren',
          body: (
            <>
              De hub is alleen toegankelijk tijdens de <InternalLink href="/schedule">openingsuren</InternalLink> of met een geldige reservatie.
            </>
          ),
        },
        {
          title: 'Aanmelden bij aankomst',
          body: 'Meld je bij aankomst aan bij een medewerker en toon de QR-code uit je bevestigingsmail. Zonder aanmelding kan je plek aan iemand anders gegeven worden.',
        },
        { title: 'Sessieduur en limieten', body: sessionRules },
        {
          title: 'Je reservatie is persoonlijk',
          body: 'Je speelt zelf op de plek die je reserveerde. Je geeft of verkoopt je reservatie niet door aan iemand anders.',
        },
        {
          title: 'Annuleren en no-shows',
          body: (
            <>
              Kan je niet komen? <InternalLink href="/reservations/how-to-cancel">Annuleer je reservatie</InternalLink> via je profiel of je
              bevestigingsmail, uiterlijk tot het begin ervan. Kom je niet opdagen zonder te annuleren, dan krijg je een no-show. Bij je eerste
              no-show krijg je een herinnering, bij de tweede een waarschuwing. Na drie no-shows in één semester kan je niet meer reserveren tot
              het volgende semester.
            </>
          ),
        },
      ],
    },
    {
      id: 'gedrag',
      title: 'Gedragscode',
      icon: Users,
      intro: 'Behandel anderen zoals je zelf behandeld wilt worden. De Gaming Hub is een veilige en inclusieve plek voor iedereen.',
      articles: [
        {
          title: 'Respect',
          body: 'Je gaat respectvol om met andere bezoekers, met de medewerkers en met de ruimte. Dat geldt in de hub, in in-game chat en voice, en op onze Discord.',
        },
        {
          title: 'Geen grensoverschrijdend gedrag',
          body: (
            <>
              Grensoverschrijdend gedrag wordt niet getolereerd. Daaronder valt, zoals AP het omschrijft, elke aantasting van de fysieke of
              psychische integriteit van een persoon, waaronder machtsmisbruik, ongewenst seksueel gedrag, geweld, discriminatie en pesterijen.
              Racisme, seksisme en homofobie horen daar ook bij. Lees ook de{' '}
              <ExternalLink href="https://student.ap.be/deontologische-code">deontologische code voor studenten</ExternalLink>.
            </>
          ),
        },
        {
          title: 'Fair play',
          body: 'Je gebruikt geen cheats, hacks of exploits, en je verstoort niet bewust het spel van anderen.',
        },
        {
          title: 'Geluid',
          body: 'Houd het volume aanvaardbaar. Gebruik een headset voor in-game geluid en voice chat.',
        },
        {
          title: 'Instructies van medewerkers',
          body: 'Je volgt de instructies van de medewerkers van de Gaming Hub. Bij een conflict of overlast spreek je meteen een medewerker aan.',
        },
        {
          title: 'Melden',
          body: (
            <>
              Word je zelf geconfronteerd met grensoverschrijdend gedrag? Spreek een medewerker aan, of neem in vertrouwen contact op met het
              meldpunt van AP via <ExternalLink href="mailto:meldpuntgog@ap.be">meldpuntgog@ap.be</ExternalLink>. Meer info vind je op{' '}
              <ExternalLink href="https://student.ap.be/grensoverschrijdend-gedrag">student.ap.be/grensoverschrijdend-gedrag</ExternalLink>.
            </>
          ),
        },
      ],
    },
    {
      id: 'middelen',
      title: 'Roken, alcohol, eten en drinken',
      icon: Ban,
      articles: [
        {
          title: 'Niet roken of vapen',
          body: 'Roken en vapen zijn verboden, net als in alle gebouwen van AP. Dat geldt voor sigaretten, e-sigaretten en vapes, en voor alle andere tabaks- en nicotineproducten.',
        },
        {
          title: 'Geen alcohol of drugs',
          body: 'Je brengt geen alcohol of drugs mee en gebruikt ze niet in de hub. Wie onder invloed is, krijgt geen toegang.',
        },
        {
          title: 'Drinken alleen in een gesloten fles',
          body: 'Drank breng je alleen mee in een afsluitbare fles of drinkbus. Houd ze dicht wanneer je niet drinkt, en houd ze uit de buurt van de apparatuur.',
        },
        {
          title: 'Eten',
          body: 'Eet niet aan of boven de apparatuur.',
        },
        {
          title: 'Laat je plek netjes achter',
          body: 'Gooi je afval weg, en laat de setup achter zoals je hem aantrof.',
        },
      ],
    },
    {
      id: 'apparatuur',
      title: 'Apparatuur en software',
      icon: Cpu,
      intro: 'Elke setup in de hub is meer dan €3.000 waard. Behandel hem met zorg.',
      articles: [
        {
          title: 'Zorgvuldig gebruik',
          body: 'Je gebruikt de apparatuur zoals ze bedoeld is. Je gaat niet agressief om met muis, toetsenbord, headset of controller.',
        },
        {
          title: 'Geen software of aanpassingen',
          body: 'Je installeert geen software en past geen systeeminstellingen aan zonder toestemming van een medewerker. Je gebruikt geen eigen USB-sticks of opslagmedia; alleen opslag die door de Gaming Hub is goedgekeurd.',
        },
        {
          title: 'Geen illegale inhoud',
          body: 'Je speelt alleen de games die op de toestellen staan. Illegale software, gekraakte games en andere illegale inhoud zijn verboden.',
        },
        {
          title: 'Je eigen accounts',
          body: 'Je logt alleen in met je eigen accounts, en deelt ze niet. Log altijd uit na je sessie: de Gaming Hub is niet verantwoordelijk voor accounts die je ingelogd laat.',
        },
        {
          title: 'Uitgeleend materiaal',
          body: 'Voor fysieke games en extra controllers kan een medewerker je studentenkaart als onderpand vragen. Breng ze terug voor het einde van je sessie.',
        },
        {
          title: 'Defecten en schade',
          body: 'Meld een defect of schade meteen aan een medewerker en probeer niets zelf te herstellen. Schade die je opzettelijk of door onzorgvuldig gebruik veroorzaakt, kan op jou verhaald worden.',
        },
      ],
    },
    {
      id: 'sancties',
      title: 'Sancties',
      icon: Gavel,
      articles: [
        {
          title: 'Ter plaatse',
          body: 'Een medewerker kan je aanspreken op je gedrag en je vragen je sessie te stoppen en de hub te verlaten.',
        },
        {
          title: 'Mogelijke maatregelen',
          body: 'Afhankelijk van de ernst van de overtreding krijg je een waarschuwing, een tijdelijke blokkering of een definitieve uitsluiting. Wie geblokkeerd is, kan niet inloggen op de website of de app en kan dus ook niet reserveren.',
        },
        {
          title: 'Ernstige feiten',
          body: (
            <>
              Ernstige feiten melden we aan AP Hogeschool. Die kunnen leiden tot een tuchtprocedure volgens het orde- en tuchtreglement van AP (zie{' '}
              <ExternalLink href="https://www.ap.be/reglementen-kalenders">ap.be/reglementen-kalenders</ExternalLink>).
            </>
          ),
        },
        {
          title: 'Vragen of bezwaar',
          body: 'Denk je dat een maatregel onterecht is? Spreek een medewerker aan of contacteer ons via Discord. We bekijken het samen met je.',
        },
      ],
    },
  ];
}

export default function InfoPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [rules, setRules] = useState<ReservationRules>({ maxPerDay: 1, minGapMinutes: 90 });
  const [activeSection, setActiveSection] = useState('toegang');

  useEffect(() => {
    apiClient
      .GET('/reservations/rules')
      .then((res) => res.data && setRules(res.data))
      .catch(() => {});
  }, []);

  const sections = buildSections(describeSessionRules(rules));

  // Highlight the section being read in the table of contents
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    document.querySelectorAll('[data-rule-section]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#d42422] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen"></div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-6 border border-white/10">
              <ScrollText size={48} className="text-[#d42422]" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg">
              HUIS<span className="text-[#d42422]">REGLEMENT</span>
            </h1>
            <p className="text-gray-400 tracking-[0.3em] font-bold text-xs mt-4 uppercase">AP Gaming Hub · Laatst bijgewerkt op {LAST_UPDATED}</p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mb-12 max-w-4xl rounded-2xl border border-white/10 bg-[#0a0f25] p-6 md:p-8 text-gray-300 leading-relaxed">
          <p>
            Dit huisreglement geldt voor iedereen die de AP Gaming Hub bezoekt of gebruikt. Wie reserveert of de hub binnenkomt, gaat ermee
            akkoord. Het vult de reglementen van AP Hogeschool aan: het onderwijs- en examenreglement, het orde- en tuchtreglement en de
            deontologische code voor studenten. Die reglementen gelden ook in de hub, en waar ze strenger zijn, gaan ze voor.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 mb-20">
          <nav className="lg:w-1/4 shrink-0" aria-label="Inhoud van het reglement">
            <div className="lg:sticky lg:top-28 rounded-2xl border border-white/10 bg-[#0a0f25] p-4">
              <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Inhoud</p>
              <ol className="space-y-1">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-[#d42422] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <Icon size={16} className={active ? 'text-white' : 'text-[#d42422]'} />
                        <span>
                          {index + 1}. {section.title}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>

          <div className="flex-1 space-y-8">
            {sections.map((section, sectionIndex) => {
              const Icon = section.icon;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  data-rule-section
                  className="scroll-mt-28 rounded-3xl border border-white/10 bg-[#0a0f25] p-6 md:p-10"
                >
                  <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
                    <Icon size={28} className="shrink-0 text-[#d42422]" />
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white">
                      <span className="text-[#d42422]">{sectionIndex + 1}.</span> {section.title}
                    </h2>
                  </div>
                  {section.intro && (
                    <p className="mb-6 rounded-xl border-l-4 border-[#d42422] bg-black/40 p-4 font-medium text-gray-300">{section.intro}</p>
                  )}
                  <ol className="space-y-5">
                    {section.articles.map((article, articleIndex) => (
                      <li key={article.title} className="flex gap-4">
                        <span className="w-10 shrink-0 pt-0.5 font-mono text-sm font-bold text-[#d42422]">
                          {sectionIndex + 1}.{articleIndex + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-white">{article.title}</h3>
                          <p className="mt-1 text-gray-400 leading-relaxed">{article.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
            <p className="px-2 text-sm text-gray-500">
              Het team van de AP Gaming Hub kan dit reglement aanpassen. De versie op deze pagina is altijd de geldende.
            </p>
          </div>
        </div>

        {/* Community */}
        <ScrollReveal direction="up">
          <div className="mb-20 pt-8">
            <div className="bg-[#0a0f25] border border-white/10 p-8 md:p-10 rounded-[1.5rem] flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left hover:border-[#d42422]/60 transition-all relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#d42422] rounded-full blur-[90px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
              <DiscordIcon size={56} className="text-[#d42422] shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold italic uppercase mb-2 text-white tracking-wider">Word lid van Discord</h2>
                <p className="text-gray-400 text-base font-medium">
                  Chat met andere studenten, vind teammates en blijf op de hoogte van events. Vragen over dit reglement kan je er ook kwijt.
                </p>
              </div>
              <a
                href="https://discord.gg/FGCC9GTetC"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-[#d42422] hover:bg-[#ff3333] text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all hover:shadow-[0_0_20px_rgba(212,36,34,0.5)]"
              >
                Open Discord
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal direction="up">
          <div className="mt-20 pt-20 border-t border-white/10">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase text-center mb-16">
              Veelgestelde <span className="text-[#d42422]">vragen</span>
            </h2>
            <div className="max-w-4xl mx-auto space-y-4">
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-[#d42422]/50">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left font-semibold text-lg hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-8">{faq.question}</span>
                    {openIndex === index ? (
                      <ChevronUp className="text-[#d42422] shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="text-gray-400 shrink-0" strokeWidth={2} />
                    )}
                  </button>
                  <div
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                      openIndex === index ? 'max-h-96 py-4 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-gray-400 text-lg leading-relaxed border-t border-white/10 pt-4">{typeof faq.answer === 'function' ? faq.answer(rules) : faq.answer}</p>
                    {faq.link && (
                      <Link href={faq.link.href} className="inline-block mt-3 text-[#d42422] hover:text-red-400 font-semibold transition-colors">
                        {faq.link.label} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
